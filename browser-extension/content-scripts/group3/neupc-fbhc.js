/**
 * NEUPC Facebook/Meta Hacker Cup Extractor (Standalone)
 * Supports:
 * - Single submission extraction from submission pages
 * - Submissions list extraction for full import pagination
 * - Problem details extraction
 * - Runtime message-based integration with background workflow
 */

(function () {
  'use strict';

  if (window.__NEUPC_FBHC_INJECTED__) {
    return;
  }
  window.__NEUPC_FBHC_INJECTED__ = true;

  const PLATFORM = 'facebookhackercup';
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
      const normalized = normalizeWhitespace(value);
      if (normalized) return normalized;
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
        reject(new Error(`Timeout waiting for ${selector}`));
      }, timeout);
    });
  }

  function toAbsoluteUrl(rawValue) {
    const value = String(rawValue || '').trim();
    if (!value) return null;

    try {
      return new URL(value, window.location.href).toString();
    } catch {
      return null;
    }
  }

  function formatSlug(slug) {
    const text = String(slug || '')
      .replace(/[-_]+/g, ' ')
      .trim();
    if (!text) return '';
    return text
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function decodeEntities(value) {
    const text = String(value || '');
    if (!text) return '';

    return text
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&nbsp;/gi, ' ');
  }

  function parseTimestampToIso(value) {
    const text = normalizeWhitespace(value);
    if (!text) return null;

    if (/^\d+$/.test(text)) {
      const numeric = Number.parseInt(text, 10);
      if (!Number.isFinite(numeric)) return null;

      const millis = text.length <= 10 ? numeric * 1000 : numeric;
      const date = new Date(millis);
      return Number.isFinite(date.getTime()) ? date.toISOString() : null;
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

    return null;
  }

  function parseDurationToMs(value) {
    const text = normalizeWhitespace(value).toLowerCase();
    if (!text) return null;

    const match = text.match(
      /([0-9]*\.?[0-9]+)\s*(ms|msec|millisecond(?:s)?|s|sec|second(?:s)?|m|min|minute(?:s)?)?/
    );
    if (!match) return null;

    const amount = Number.parseFloat(match[1]);
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

    return amount <= 20 ? Math.round(amount * 1000) : Math.round(amount);
  }

  function parseMemoryToKb(value) {
    const text = normalizeWhitespace(value).toLowerCase();
    if (!text) return null;

    const match = text.match(/([0-9]*\.?[0-9]+)\s*(kb|mb|gb|b)?/);
    if (!match) return null;

    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) return null;

    const unit = String(match[2] || 'kb').toLowerCase();
    if (unit === 'gb') return Math.round(amount * 1024 * 1024);
    if (unit === 'mb') return Math.round(amount * 1024);
    if (unit === 'b') return Math.round(amount / 1024);
    return Math.round(amount);
  }

  function normalizeVerdict(rawValue) {
    const value = String(rawValue || '')
      .trim()
      .toUpperCase();
    if (!value) return 'UNKNOWN';

    if (
      value.includes('ACCEPTED') ||
      value.includes('CORRECT') ||
      value.includes('PASSED') ||
      value === 'AC'
    ) {
      return 'AC';
    }
    if (value.includes('PARTIAL') || value === 'PC') {
      return 'PC';
    }
    if (
      value.includes('WRONG') ||
      value.includes('INCORRECT') ||
      value.includes('FAILED') ||
      value === 'WA'
    ) {
      return 'WA';
    }
    if (
      value.includes('TIME LIMIT') ||
      value.includes('TIMEOUT') ||
      value === 'TLE'
    ) {
      return 'TLE';
    }
    if (value.includes('MEMORY LIMIT') || value === 'MLE') {
      return 'MLE';
    }
    if (
      value.includes('RUNTIME ERROR') ||
      value.includes('SEGFAULT') ||
      value === 'RE'
    ) {
      return 'RE';
    }
    if (value.includes('COMPIL') || value === 'CE') {
      return 'CE';
    }
    if (
      value.includes('PENDING') ||
      value.includes('RUNNING') ||
      value.includes('QUEUE') ||
      value.includes('JUDGING')
    ) {
      return 'PENDING';
    }

    return value;
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
      /\breturn\s+[\w\d"'`_.()]+\s*;/,
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

  class FBHCExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
      this.messageListenerAttached = false;
    }

    detectPageType() {
      const host = String(window.location.hostname || '').toLowerCase();
      const path = String(window.location.pathname || '').toLowerCase();
      const search = String(window.location.search || '').toLowerCase();
      const fullUrl = `${path}${search}`;

      if (!host.includes('facebook.com')) {
        return 'unknown';
      }

      if (!path.includes('/codingcompetitions/hacker-cup')) {
        return 'unknown';
      }

      // Treat explicit per-submission URLs as single-submission pages.
      if (
        /\/submission\/\d{3,}(?:\/|$)/i.test(path) ||
        /\/submissions\/\d{3,}(?:\/|$)/i.test(path) ||
        /(?:[?&]submission_id=\d{3,}|[?&]submissionId=\d{3,}|[?&]id=\d{3,})/i.test(
          search
        )
      ) {
        return 'submission';
      }

      // Treat collection/list pages as submissions pages.
      if (
        /\/my-submissions(?:\/|$)/i.test(path) ||
        /\/submissions(?:\/|$)/i.test(path) ||
        /\/submissions-list(?:\/|$)/i.test(path) ||
        /\/results?(?:\/|$)/i.test(path) ||
        /(?:[?&](?:view|tab|section)=(?:submissions?|results?|scoreboard))/i.test(
          fullUrl
        )
      ) {
        return 'submissions';
      }

      if (/\/(?:problems?|tasks?)\//i.test(path)) {
        return 'problem';
      }

      return 'contest';
    }

    parseContestContext(url = window.location.href) {
      let parsed;
      try {
        parsed = new URL(url, window.location.origin);
      } catch {
        parsed = new URL(window.location.href);
      }

      const path = parsed.pathname || '';
      const match = path.match(
        /\/codingcompetitions\/hacker-cup\/(\d{4})(?:\/([^/?#]+))?/i
      );

      const year = match?.[1] || null;
      const roundSlug = match?.[2] ? decodeEntities(match[2]) : null;
      const roundName = roundSlug ? formatSlug(roundSlug) : null;

      return {
        year,
        roundSlug,
        roundName,
        contestId: firstNonEmpty(
          year && roundSlug ? `${year}-${roundSlug}` : null,
          year,
          roundSlug,
          'hacker-cup'
        ),
      };
    }

    getSubmissionIdFromValue(value) {
      const raw = String(value || '').trim();
      if (!raw) return null;

      const fromPath = raw.match(/\/submissions?\/(\d{4,})/i)?.[1];
      if (fromPath) return fromPath;

      const fromQuery = raw.match(/[?&](?:submission_id|submissionId)=(\d{4,})/i)?.[1];
      if (fromQuery) return fromQuery;

      // Some pages expose single-submission views via query id.
      if (/\/submission(?:s)?(?:\/|$)/i.test(raw)) {
        const genericId = raw.match(/[?&]id=(\d{4,})/i)?.[1];
        if (genericId) return genericId;
      }

      const fromNumber = raw.match(/\b(\d{5,})\b/)?.[1];
      if (fromNumber) return fromNumber;

      return null;
    }

    getProblemFromUrl(url = window.location.href) {
      const value = String(url || '');

      const idFromPath =
        value.match(/\/(?:problems?|tasks?)\/([^/?#]+)/i)?.[1] || null;
      if (idFromPath) {
        return decodeEntities(idFromPath);
      }

      const idFromQuery =
        value.match(/[?&](?:problem|task|problem_id)=([^&#]+)/i)?.[1] || null;
      if (idFromQuery) {
        return decodeEntities(idFromQuery);
      }

      return null;
    }

    async getUserHandle() {
      const profileLink = safeQuery(
        'a[href*="/profile.php?id="], a[href*="/people/"], a[href*="/user/"], a[aria-label*="profile" i]'
      );
      if (profileLink) {
        const href = profileLink.getAttribute('href') || profileLink.href || '';
        const profileId = href.match(/[?&]id=(\d+)/i)?.[1];
        if (profileId) return `fb_${profileId}`;

        const fromPath = href.match(/\/(?:people|user)\/([^/?#]+)/i)?.[1];
        if (fromPath) return decodeEntities(fromPath);

        const fromText = extractText(profileLink);
        if (fromText && fromText.length <= 60) return fromText;
      }

      const inlineScripts = safeQueryAll('script:not([src])');
      for (const script of inlineScripts) {
        const text = script.textContent || '';
        if (!text) continue;

        const idMatch = text.match(/"user[_-]?id"\s*:\s*"?(\d{5,})"?/i);
        if (idMatch?.[1]) return `fb_${idMatch[1]}`;

        const usernameMatch = text.match(
          /"(?:username|profile_name|handle)"\s*:\s*"([^"\\]{2,64})"/i
        );
        if (usernameMatch?.[1]) return decodeEntities(usernameMatch[1]);
      }

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

    extractProblemMeta(contextNode = document) {
      const problemLink =
        safeQuery('a[href*="/problems/"]', contextNode) ||
        safeQuery('a[href*="/tasks/"]', contextNode);

      const problemHref =
        problemLink?.getAttribute('href') || problemLink?.href || '';

      const problemId = firstNonEmpty(
        this.getProblemFromUrl(problemHref),
        this.getProblemFromUrl(window.location.href)
      );

      const rawHeading = firstNonEmpty(
        extractText('h1', contextNode),
        extractText('h2', contextNode),
        extractText('[class*="problem"][class*="title"]', contextNode),
        problemLink ? extractText(problemLink) : null,
        problemId
      );

      let problemName = rawHeading;
      if (problemName && /^[A-Z]\s*[:.)-]\s+/.test(problemName)) {
        problemName = problemName.replace(/^[A-Z]\s*[:.)-]\s+/, '').trim();
      }

      const problemUrl =
        toAbsoluteUrl(problemHref) ||
        (problemId
          ? toAbsoluteUrl(
              `/codingcompetitions/hacker-cup/problems/${encodeURIComponent(problemId)}`
            )
          : null);

      return {
        problemId,
        problemName: firstNonEmpty(problemName, problemId),
        problemUrl,
      };
    }

    extractVerdictText(container = document, fallbackText = '') {
      const verdictNodes = [
        safeQuery('[data-testid*="result" i]', container),
        safeQuery('[class*="verdict"]', container),
        safeQuery('[class*="status"]', container),
        safeQuery('[class*="result"]', container),
        safeQuery('[aria-label*="result" i]', container),
      ].filter(Boolean);

      for (const node of verdictNodes) {
        const text = extractText(node);
        if (
          /(accepted|correct|wrong|failed|time limit|memory limit|runtime|compile|pending|partial|judging)/i.test(
            text
          )
        ) {
          return text;
        }
        const className = String(node.className || '').toLowerCase();
        if (/success|correct|green/.test(className)) {
          return 'Accepted';
        }
        if (/wrong|failed|error|red/.test(className)) {
          return 'Wrong Answer';
        }
      }

      const combinedText = normalizeWhitespace(
        `${extractText(container)} ${fallbackText}`
      );
      const match = combinedText.match(
        /(accepted|correct|wrong answer|failed|time limit exceeded|memory limit exceeded|runtime error|compilation error|pending|partial(?:ly)?)/i
      );

      return match?.[1] || fallbackText || null;
    }

    extractLanguageText(container = document, fallbackText = '') {
      const languageNode =
        safeQuery('[class*="language"]', container) ||
        safeQuery('[data-testid*="language" i]', container) ||
        safeQuery('[aria-label*="language" i]', container);

      const explicit = extractText(languageNode);
      if (explicit && /^[A-Za-z0-9#+_. -]{2,40}$/.test(explicit)) {
        return explicit;
      }

      const fromText = normalizeWhitespace(
        `${extractText(container)} ${fallbackText}`
      ).match(
        /\b(C\+\+\s*\d*|C#|Java(?:\s*\d+)?|Python\s*\d*|PyPy\s*\d*|JavaScript|TypeScript|Rust|Go|Kotlin|Swift|Ruby|Scala|Haskell|PHP)\b/i
      )?.[1];

      return fromText || null;
    }

    extractSourceCode() {
      const candidates = [];

      const pushCandidate = (rawValue, selector, bonus = 0) => {
        const cleaned = cleanSourceCode(rawValue);
        if (!cleaned) return;

        let score = cleaned.length + bonus;
        if (looksLikeCode(cleaned)) score += 1000;
        if (/textarea/i.test(selector)) score += 60;
        if (/code|pre|editor/i.test(selector)) score += 120;

        candidates.push({ score, code: cleaned });
      };

      const monacoLines = safeQueryAll('.monaco-editor .view-lines .view-line')
        .map((line) => line.innerText || line.textContent || '')
        .map((line) => line.replace(/\u00A0/g, ' '));
      if (monacoLines.length > 0) {
        pushCandidate(monacoLines.join('\n'), 'monaco-lines', 320);
      }

      const aceLines = safeQueryAll('.ace_line')
        .map((line) => line.innerText || line.textContent || '')
        .map((line) => line.replace(/\u00A0/g, ' '));
      if (aceLines.length > 0) {
        pushCandidate(aceLines.join('\n'), 'ace-lines', 300);
      }

      const codeMirrorLines = safeQueryAll('.CodeMirror-code pre').map(
        (line) => line.textContent || ''
      );
      if (codeMirrorLines.length > 0) {
        pushCandidate(codeMirrorLines.join('\n'), 'codemirror-lines', 280);
      }

      const selectors = [
        '[class*="code"] pre',
        '[class*="code"] code',
        '[class*="editor"] pre',
        '[class*="editor"] code',
        'pre code',
        'pre',
        'textarea',
      ];

      selectors.forEach((selector) => {
        safeQueryAll(selector).forEach((node) => {
          const raw =
            typeof node.value === 'string' ? node.value : node.textContent;
          pushCandidate(raw, selector);
        });
      });

      if (candidates.length === 0) return null;
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].code;
    }

    extractSubmissionFromCurrentPage() {
      const rows = this.extractKeyValueRows();
      const context = this.parseContestContext();

      const submissionId =
        this.getSubmissionIdFromValue(window.location.href) ||
        this.getSubmissionIdFromValue(
          this.findValueByKey(rows, [/submission\s*id/, /^id$/])
        ) ||
        this.getSubmissionIdFromValue(
          String(document.body?.innerText || '').match(
            /submission\s*id\s*:?\s*(\d{4,})/i
          )?.[1]
        );

      if (!submissionId) {
        return null;
      }

      const problemMeta = this.extractProblemMeta(document);

      const verdictText = firstNonEmpty(
        this.findValueByKey(rows, [/status/, /result/, /verdict/]),
        this.extractVerdictText(document)
      );

      const language = firstNonEmpty(
        this.findValueByKey(rows, [/language/, /^lang\b/]),
        this.extractLanguageText(document),
        'Unknown'
      );

      const executionTime = parseDurationToMs(
        firstNonEmpty(
          this.findValueByKey(rows, [/runtime/, /execution/, /^time$/]),
          extractText('[class*="runtime"]')
        )
      );

      const memoryUsed = parseMemoryToKb(
        firstNonEmpty(
          this.findValueByKey(rows, [/memory/, /mem\b/]),
          extractText('[class*="memory"]')
        )
      );

      const submittedAt =
        parseTimestampToIso(
          safeQuery('time[datetime]')?.getAttribute('datetime') ||
            this.findValueByKey(rows, [
              /submitted/,
              /submission\s*time/,
              /^time$/,
              /^date$/,
            ])
        ) || null;

      const sourceCode = this.extractSourceCode();

      const submissionUrl = firstNonEmpty(
        toAbsoluteUrl(window.location.href),
        `https://www.facebook.com/codingcompetitions/hacker-cup/submissions/${submissionId}`
      );

      return {
        platform: this.platform,
        handle: null,
        problemId: problemMeta.problemId,
        problemName: firstNonEmpty(
          problemMeta.problemName,
          problemMeta.problemId
        ),
        problemUrl: problemMeta.problemUrl,
        submissionId: String(submissionId),
        submissionUrl,
        verdict: normalizeVerdict(verdictText || 'UNKNOWN'),
        language,
        executionTime,
        memoryUsed,
        submittedAt,
        sourceCode,
        contestId: context.contestId,
        roundName: firstNonEmpty(context.roundName, context.roundSlug, null),
        problem_id: problemMeta.problemId,
        problem_name: firstNonEmpty(
          problemMeta.problemName,
          problemMeta.problemId
        ),
        problem_url: problemMeta.problemUrl,
        submission_id: String(submissionId),
        submission_url: submissionUrl,
        source_code: sourceCode,
        execution_time_ms: executionTime,
        memory_kb: memoryUsed,
        submitted_at: submittedAt,
        contest_id: context.contestId,
      };
    }

    extractSubmissionFromListRow(row) {
      const rowText = normalizeWhitespace(extractText(row));
      if (!rowText || rowText.length < 6) {
        return null;
      }

      const context = this.parseContestContext();

      const submissionLink =
        safeQuery('a[href*="/submission/"]', row) ||
        safeQuery('a[href*="/submissions/"]', row) ||
        safeQuery('a[href*="submission"]', row);
      const submissionHref =
        submissionLink?.getAttribute('href') || submissionLink?.href || '';

      const submissionId =
        this.getSubmissionIdFromValue(submissionHref) ||
        this.getSubmissionIdFromValue(rowText);
      if (!submissionId) {
        return null;
      }

      const problemMeta = this.extractProblemMeta(row);
      const verdictText = this.extractVerdictText(row, rowText);
      const language = firstNonEmpty(
        this.extractLanguageText(row, rowText),
        'Unknown'
      );

      const executionTime = parseDurationToMs(
        rowText.match(
          /([0-9]*\.?[0-9]+\s*(?:ms|msec|millisecond(?:s)?|s|sec|second(?:s)?|m|min|minute(?:s)?))/i
        )?.[1]
      );

      const memoryUsed = parseMemoryToKb(
        rowText.match(/([0-9]*\.?[0-9]+\s*(?:kb|mb|gb|b))/i)?.[1]
      );

      const submittedAt =
        parseTimestampToIso(
          safeQuery('time[datetime]', row)?.getAttribute('datetime') ||
            rowText.match(
              /(\d{4}[-./]\d{1,2}[-./]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/
            )?.[1] ||
            rowText.match(
              /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/
            )?.[1]
        ) || null;

      const rowHandleHref =
        safeQuery('a[href*="/profile.php?id="]', row)?.getAttribute('href') ||
        safeQuery('a[href*="/people/"]', row)?.getAttribute('href') ||
        '';
      const rowHandle = rowHandleHref.match(/[?&]id=(\d+)/i)?.[1]
        ? `fb_${rowHandleHref.match(/[?&]id=(\d+)/i)?.[1]}`
        : rowHandleHref.match(/\/(?:people|user)\/([^/?#]+)/i)?.[1] || null;

      const submissionUrl =
        toAbsoluteUrl(submissionHref) ||
        `https://www.facebook.com/codingcompetitions/hacker-cup/submissions/${submissionId}`;

      return {
        platform: this.platform,
        handle: rowHandle,
        problemId: problemMeta.problemId,
        problemName: firstNonEmpty(
          problemMeta.problemName,
          problemMeta.problemId
        ),
        problemUrl: problemMeta.problemUrl,
        submissionId: String(submissionId),
        submissionUrl,
        verdict: normalizeVerdict(verdictText || 'UNKNOWN'),
        language,
        executionTime,
        memoryUsed,
        submittedAt,
        sourceCode: null,
        contestId: context.contestId,
        roundName: firstNonEmpty(context.roundName, context.roundSlug, null),
        problem_id: problemMeta.problemId,
        problem_name: firstNonEmpty(
          problemMeta.problemName,
          problemMeta.problemId
        ),
        problem_url: problemMeta.problemUrl,
        submission_id: String(submissionId),
        submission_url: submissionUrl,
        source_code: null,
        execution_time_ms: executionTime,
        memory_kb: memoryUsed,
        submitted_at: submittedAt,
        contest_id: context.contestId,
      };
    }

    getSubmissionsRowCandidates() {
      const tableRows = safeQueryAll('table tbody tr');
      if (tableRows.length > 0) {
        return tableRows;
      }

      const rows = safeQueryAll('tr').filter((row) => {
        return safeQueryAll('td', row).length >= 2;
      });
      if (rows.length > 0) {
        return rows;
      }

      const containers = [];
      const seen = new Set();
      safeQueryAll('a[href*="/submissions/"], a[href*="/submission/"]').forEach(
        (anchor) => {
        const container =
          anchor.closest(
            'tr, li, article, [role="row"], [class*="submission"], [class*="row"]'
          ) || anchor;

        if (seen.has(container)) return;
        seen.add(container);
        containers.push(container);
        }
      );

      return containers;
    }

    findSubmissionsLandingUrl() {
      const currentUrl = String(window.location.href || '');

      const candidates = safeQueryAll('a[href]')
        .map((anchor) => {
          const href = String(anchor.getAttribute('href') || '').trim();
          if (!href || href.startsWith('#') || /^javascript:/i.test(href)) {
            return null;
          }

          const absolute = toAbsoluteUrl(href);
          if (!absolute || absolute === currentUrl) {
            return null;
          }

          const text = extractText(anchor).toLowerCase();
          return { absolute, text };
        })
        .filter(Boolean);

      const preferred = candidates.find(({ absolute, text }) => {
        return (
          /facebook\.com\/codingcompetitions\/hacker-cup/i.test(absolute) &&
          /\/(?:my-)?submissions?(?:\/|$)|\/results?(?:\/|$)|\/submissions-list(?:\/|$)/i.test(
            absolute
          ) &&
          /submission|result|score/i.test(text)
        );
      });

      if (preferred) {
        return preferred.absolute;
      }

      const fallback = candidates.find(({ absolute }) => {
        return (
          /facebook\.com\/codingcompetitions\/hacker-cup/i.test(absolute) &&
          /\/(?:my-)?submissions?(?:\/|$)|\/results?(?:\/|$)|\/submissions-list(?:\/|$)/i.test(
            absolute
          )
        );
      });

      return fallback?.absolute || null;
    }

    extractSubmissionsFromHtmlSnapshot(options = {}) {
      const html = String(document.documentElement?.innerHTML || '');
      if (!html) {
        return [];
      }

      const submissions = [];
      const seen = new Set();
      const expectedHandle = normalizeWhitespace(
        options.expectedHandle || ''
      ).toLowerCase();

      const regex =
        /\/codingcompetitions\/hacker-cup[^"'\s<]*?\/(?:submission|submissions)\/(\d{4,})/gi;
      let match;

      while ((match = regex.exec(html)) != null && submissions.length < 800) {
        const submissionId = String(match[1] || '').trim();
        if (!submissionId || seen.has(submissionId)) {
          continue;
        }

        const start = Math.max(0, match.index - 700);
        const end = Math.min(html.length, match.index + 900);
        const chunk = html.slice(start, end);

        const problemId =
          chunk.match(/\/(?:problems?|tasks?)\/([^/?#"'\s<]+)/i)?.[1] || null;
        const verdictRaw =
          chunk.match(
            /(accepted|correct|wrong answer|failed|time limit exceeded|memory limit exceeded|runtime error|compilation error|partial|pending)/i
          )?.[1] || 'UNKNOWN';

        const handleFromChunk = chunk.match(/[?&]id=(\d{5,})/i)?.[1]
          ? `fb_${chunk.match(/[?&]id=(\d{5,})/i)?.[1]}`
          : chunk.match(/\/(?:people|user)\/([^/?#"'\s<]+)/i)?.[1] || null;

        if (expectedHandle && handleFromChunk) {
          const normalizedRowHandle =
            normalizeWhitespace(handleFromChunk).toLowerCase();
          if (normalizedRowHandle !== expectedHandle) {
            continue;
          }
        }

        const submissionUrl = `https://www.facebook.com/codingcompetitions/hacker-cup/submissions/${submissionId}`;
        const problemUrl = problemId
          ? toAbsoluteUrl(
              `/codingcompetitions/hacker-cup/problems/${encodeURIComponent(problemId)}`
            )
          : null;

        submissions.push({
          platform: this.platform,
          handle: handleFromChunk,
          problemId,
          problemName: problemId,
          problemUrl,
          submissionId,
          submissionUrl,
          verdict: normalizeVerdict(verdictRaw),
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

        seen.add(submissionId);
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

    extractNextPageUrl() {
      const currentUrl = window.location.href;

      let bestUrl = null;
      let bestPage = Number.POSITIVE_INFINITY;
      let fallbackUrl = null;

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
        if (!absolute || absolute === currentUrl) {
          return;
        }

        const text = extractText(anchor).toLowerCase();
        const rel = String(anchor.getAttribute('rel') || '').toLowerCase();
        const title = String(anchor.getAttribute('title') || '').toLowerCase();

        const isNextLike =
          rel.includes('next') ||
          /(^|\s)(next|newer|>|>>|›|»)(\s|$)/i.test(text) ||
          /next/i.test(title);

        if (!isNextLike) {
          return;
        }

        if (!fallbackUrl) {
          fallbackUrl = absolute;
        }

        try {
          const parsed = new URL(absolute);
          const page = Number.parseInt(
            parsed.searchParams.get('page') ||
              parsed.searchParams.get('p') ||
              parsed.searchParams.get('offset') ||
              '',
            10
          );

          if (Number.isFinite(page) && page >= 0 && page < bestPage) {
            bestPage = page;
            bestUrl = absolute;
          }
        } catch {
          // Ignore malformed next-page URLs.
        }
      });

      return bestUrl || fallbackUrl || null;
    }

    hasExplicitNoSubmissionsState() {
      const text = normalizeWhitespace(
        extractText(document.body)
      ).toLowerCase();
      if (!text) return false;

      return /(no submissions?|no results?|nothing found|you have not submitted)/i.test(
        text
      );
    }

    isSubmissionsPageReady() {
      const pageType = this.detectPageType();
      if (pageType !== 'submissions' && pageType !== 'contest') {
        return false;
      }

      if (this.getSubmissionsRowCandidates().length > 0) {
        return true;
      }

      if (safeQuery('a[href*="/submissions/"]')) {
        return true;
      }

      if (this.hasExplicitNoSubmissionsState()) {
        return true;
      }

      const bodyText = String(document.body?.innerText || '').toLowerCase();
      if (!bodyText) return false;
      if (/(loading|please wait|fetching)/i.test(bodyText)) return false;

      return /submission|result|scoreboard|leaderboard/i.test(bodyText);
    }

    extractSubmissionsFromPage(options = {}) {
      const expectedHandle = normalizeWhitespace(
        options.expectedHandle || ''
      ).toLowerCase();
      const shouldFilterByHandle = options.filterByHandle === true;

      const rows = this.getSubmissionsRowCandidates();
      const submissions = [];
      const seen = new Set();

      for (const row of rows) {
        const parsed = this.extractSubmissionFromListRow(row);
        if (!parsed?.submissionId) continue;

        if (shouldFilterByHandle && expectedHandle) {
          const rowHandle = normalizeWhitespace(
            parsed.handle || ''
          ).toLowerCase();
          if (rowHandle && rowHandle !== expectedHandle) {
            continue;
          }
        }

        if (seen.has(parsed.submissionId)) {
          continue;
        }

        seen.add(parsed.submissionId);
        submissions.push(parsed);
      }

      if (submissions.length === 0) {
        return this.extractSubmissionsFromHtmlSnapshot({
          expectedHandle,
          filterByHandle: shouldFilterByHandle,
        });
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

    extractProblemDetails() {
      const context = this.parseContestContext();
      const problemMeta = this.extractProblemMeta(document);

      const candidateSelectors = [
        '[class*="problem-statement"]',
        '[data-testid*="problem" i]',
        '[class*="statement"]',
        '[class*="markdown"]',
        '[class*="challenge-body"]',
        'article',
        'main',
      ];

      let bestStatementText = '';
      let bestScore = -1;

      candidateSelectors.forEach((selector) => {
        safeQueryAll(selector).forEach((node) => {
          const text = extractMultilineText(node);
          if (!text || text.length < 80) return;

          let score = text.length;
          if (
            /(input|output|constraints?|sample\s+input|sample\s+output|problem\s+statement)/i.test(
              text
            )
          ) {
            score += 800;
          }

          if (score > bestScore) {
            bestScore = score;
            bestStatementText = text;
          }
        });
      });

      if (!bestStatementText) {
        bestStatementText = extractMultilineText(document.body);
      }

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
        'Notes',
      ];

      let description =
        extractLabeledSection(
          bestStatementText,
          ['Problem Statement', 'Statement', 'Description'],
          sectionStops
        ) || null;

      if (!description && bestStatementText) {
        const preface = bestStatementText.match(
          /^[\s\S]*?(?=\n\s*(?:Input(?:\s+Format)?|Output(?:\s+Format)?|Constraints?|Sample\s+Input|Sample\s+Output|Examples?|Explanation|Notes?)\s*:|$)/i
        )?.[0];

        const prefaceText = normalizeWhitespace(preface || '');
        if (prefaceText.length >= 20) {
          description = prefaceText;
        }
      }

      const inputFormat = extractLabeledSection(
        bestStatementText,
        ['Input Format', 'Input'],
        sectionStops
      );
      const outputFormat = extractLabeledSection(
        bestStatementText,
        ['Output Format', 'Output'],
        sectionStops
      );
      const constraints = extractLabeledSection(
        bestStatementText,
        ['Constraints'],
        sectionStops
      );
      const notes = extractLabeledSection(
        bestStatementText,
        ['Notes', 'Explanation'],
        sectionStops
      );
      const examples = parseSampleTests(bestStatementText);

      const textForLimits = `${bestStatementText}\n${extractText(document.body)}`;
      const timeLimitMs = parseDurationToMs(
        textForLimits.match(
          /time\s*limit\s*:?\s*([0-9]*\.?[0-9]+\s*(?:ms|msec|millisecond(?:s)?|s|sec|second(?:s)?|m|min|minute(?:s)?))/i
        )?.[1]
      );
      const memoryLimitKb = parseMemoryToKb(
        textForLimits.match(
          /memory\s*limit\s*:?\s*([0-9]*\.?[0-9]+\s*(?:kb|mb|gb|b))/i
        )?.[1]
      );

      return {
        platform: this.platform,
        contestId: context.contestId,
        roundName: firstNonEmpty(context.roundName, context.roundSlug, null),
        problemId: problemMeta.problemId,
        problemName: firstNonEmpty(
          problemMeta.problemName,
          problemMeta.problemId
        ),
        problemUrl: problemMeta.problemUrl,
        description: description || null,
        problemDescription: description || null,
        problem_description: description || null,
        inputFormat: inputFormat || null,
        input_format: inputFormat || null,
        outputFormat: outputFormat || null,
        output_format: outputFormat || null,
        constraints: constraints || null,
        examples,
        sample_tests: examples,
        notes: notes || null,
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
        difficultyRating: null,
        difficulty_rating: null,
      };
    }

    hasMeaningfulProblemDetails(details) {
      if (!details || typeof details !== 'object') {
        return false;
      }

      const description = String(
        details.description || details.problemDescription || ''
      ).trim();
      const inputFormat = String(details.inputFormat || '').trim();
      const outputFormat = String(details.outputFormat || '').trim();
      const constraints = String(details.constraints || '').trim();
      const examples = Array.isArray(details.examples) ? details.examples : [];

      const hasDescription = description.length >= 20;
      const hasInputOutput = inputFormat.length > 0 && outputFormat.length > 0;
      const hasConstraints = constraints.length > 0;
      const hasExamples = examples.length > 0;

      return hasDescription || hasInputOutput || hasConstraints || hasExamples;
    }

    async handleExtractSubmissionMessage(request, sendResponse) {
      try {
        const pageType = this.detectPageType();

        if (pageType === 'unknown') {
          sendResponse({
            success: false,
            nonRetriable: true,
            error: 'Not on a Facebook Hacker Cup page',
          });
          return;
        }

        await waitForElement('body', 4500).catch(() => null);
        await sleep(250);

        let submission = this.extractSubmissionFromCurrentPage();
        if (!submission) {
          const listSubmissions = this.extractSubmissionsFromPage({
            expectedHandle: request?.handle,
            filterByHandle: false,
          });
          submission = listSubmissions[0] || null;
        }

        if (!submission) {
          sendResponse({
            success: false,
            pending: true,
            error: 'Hacker Cup submission data not ready yet',
          });
          return;
        }

        const requiresSourceCode = request?.requireSourceCode === true;
        const sourceCode = firstNonEmpty(
          submission.sourceCode,
          submission.source_code
        );

        if (requiresSourceCode && !sourceCode) {
          sendResponse({
            success: false,
            pending: true,
            data: submission,
            error: 'Hacker Cup source code not ready yet',
          });
          return;
        }

        sendResponse({ success: true, data: submission, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Failed to extract Hacker Cup submission',
        });
      }
    }

    async handleExtractSubmissionsMessage(request, sendResponse) {
      try {
        if (!this.isSubmissionsPageReady()) {
          sendResponse({
            success: false,
            pending: true,
            error: 'Hacker Cup submissions page still loading',
          });
          return;
        }

        await waitForElement('body', 4500).catch(() => null);
        await sleep(250);

        let submissions = this.extractSubmissionsFromPage({
          expectedHandle: request?.handle,
          filterByHandle: request?.options?.filterByHandle === true,
        });

        if (submissions.length === 0 && !this.hasExplicitNoSubmissionsState()) {
          const landingUrl = this.findSubmissionsLandingUrl();
          if (landingUrl) {
            sendResponse({
              success: true,
              data: {
                submissions: [],
                nextPageUrl: landingUrl,
                currentUrl: window.location.href,
              },
              error: null,
            });
            return;
          }

          sendResponse({
            success: false,
            pending: true,
            error: 'Hacker Cup submissions are still being rendered',
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
          error:
            error?.message || 'Failed to extract Hacker Cup submissions page',
        });
      }
    }

    async handleExtractProblemDetailsMessage(sendResponse) {
      try {
        const pageType = this.detectPageType();
        if (pageType !== 'problem' && pageType !== 'contest') {
          sendResponse({
            success: false,
            pending: true,
            error: 'Not on a Hacker Cup problem page yet',
          });
          return;
        }

        await waitForElement('body', 4500).catch(() => null);
        await sleep(300);

        const details = this.extractProblemDetails();
        if (!this.hasMeaningfulProblemDetails(details)) {
          sendResponse({
            success: false,
            pending: true,
            error: 'Hacker Cup problem details not ready yet',
          });
          return;
        }

        sendResponse({ success: true, data: details, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error:
            error?.message || 'Failed to extract Hacker Cup problem details',
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
          if (request?.action === 'extractSubmission') {
            this.handleExtractSubmissionMessage(request, sendResponse);
            return true;
          }

          if (
            request?.action === 'extractSubmissionsPage' ||
            request?.action === 'extractSubmissions'
          ) {
            this.handleExtractSubmissionsMessage(request, sendResponse);
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

    storeSubmission(submission) {
      if (!browserAPI?.storage?.local || !submission?.submissionId) {
        return;
      }

      browserAPI.storage.local.get(['cachedSubmissions'], (result) => {
        const cached = result.cachedSubmissions || {};
        const platformCache = Array.isArray(cached[this.platform])
          ? cached[this.platform]
          : [];

        const exists = platformCache.some(
          (entry) => entry?.submissionId === submission.submissionId
        );
        if (exists) {
          return;
        }

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
      if (!browserAPI?.runtime || !browserAPI?.storage?.sync) {
        return;
      }

      browserAPI.storage.sync.get(
        ['autoSyncEnabled', 'autoFetchEnabled', 'autoSync', 'extensionToken'],
        (settings) => {
          const autoEnabled =
            settings.autoSyncEnabled === true ||
            settings.autoFetchEnabled === true ||
            settings.autoSync === true;

          if (!autoEnabled || !settings.extensionToken) {
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
      if (this.initialized) {
        return;
      }

      this.setupMessageListener();

      const pageType = this.detectPageType();
      if (pageType === 'submission') {
        try {
          const submission = this.extractSubmissionFromCurrentPage();
          if (submission?.submissionId) {
            submission.handle =
              (await this.getUserHandle()) || submission.handle;
            this.storeSubmission(submission);
          }
        } catch (error) {
          logWarn(
            'Initialization submission extraction failed:',
            error?.message
          );
        }
      }

      this.initialized = true;
      log('Hacker Cup extractor initialized on page type:', pageType);
    }
  }

  function bootstrap() {
    const extractor = new FBHCExtractor();
    extractor.init();
    window.__neupcExtractor = extractor;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
