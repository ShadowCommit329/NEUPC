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

  function decodeUriComponentSafe(value) {
    const text = String(value || '').trim();
    if (!text) return '';

    try {
      return decodeURIComponent(text);
    } catch {
      return text;
    }
  }

  function resolveFacebookLinkShim(rawValue) {
    const absolute = toAbsoluteUrl(rawValue);
    if (!absolute) {
      return null;
    }

    try {
      const parsed = new URL(absolute);
      const isFacebookHost =
        /facebook\.com$/i.test(parsed.hostname) ||
        /\.facebook\.com$/i.test(parsed.hostname);

      if (!isFacebookHost || !/\/l\.php$/i.test(parsed.pathname)) {
        return absolute;
      }

      const candidates = [
        parsed.searchParams.get('u'),
        parsed.searchParams.get('href'),
        parsed.searchParams.get('url'),
        parsed.searchParams.get('target'),
      ];

      for (const candidate of candidates) {
        const decoded = decodeUriComponentSafe(decodeEntities(candidate));
        const nestedAbsolute = toAbsoluteUrl(decoded);
        if (nestedAbsolute) {
          return nestedAbsolute;
        }
      }
    } catch {
      return absolute;
    }

    return absolute;
  }

  function normalizeCompetitionCrawlerUrl(rawValue) {
    const resolved = resolveFacebookLinkShim(rawValue);
    if (!resolved) {
      return null;
    }

    try {
      const parsed = new URL(resolved);
      const isFacebookHost =
        /facebook\.com$/i.test(parsed.hostname) ||
        /\.facebook\.com$/i.test(parsed.hostname);
      if (!isFacebookHost) {
        return null;
      }

      const pathname = String(parsed.pathname || '').replace(/\/+$/, '') || '/';
      if (
        !/\/codingcompetitions\/(?:hacker-cup|profile)(?:\/|$)/i.test(pathname)
      ) {
        return null;
      }

      const allowedSearchKeys = new Set([
        'view',
        'tab',
        'section',
        'problem',
        'task',
        'problem_id',
        'submission_id',
        'submissionId',
        'result_id',
        'resultId',
        'id',
      ]);
      const normalizedSearch = new URLSearchParams();

      parsed.searchParams.forEach((value, key) => {
        if (allowedSearchKeys.has(key)) {
          normalizedSearch.append(key, value);
        }
      });

      parsed.pathname = pathname;
      parsed.search = normalizedSearch.toString()
        ? `?${normalizedSearch.toString()}`
        : '';
      parsed.hash = '';

      return parsed.toString();
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

      if (!path.includes('/codingcompetitions/')) {
        return 'unknown';
      }

      // Facebook Coding Competitions profile can expose contest history links
      // that we crawl when submissions pages are unavailable.
      if (/\/codingcompetitions\/profile(?:\/|$)/i.test(path)) {
        return 'contest';
      }

      if (!path.includes('/codingcompetitions/hacker-cup')) {
        return 'unknown';
      }

      // Treat explicit per-submission URLs as single-submission pages.
      if (
        /\/submission\/\d{3,}(?:\/|$)/i.test(path) ||
        /\/submissions\/\d{3,}(?:\/|$)/i.test(path) ||
        /(?:[?&]submission_id=\d{3,}|[?&]submissionId=\d{3,})/i.test(search) ||
        (/\/submission(?:s)?(?:\/|$)/i.test(path) &&
          /[?&]id=\d{3,}/i.test(search))
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

      const fromPath = raw.match(/\/submissions?\/(\d{3,})/i)?.[1];
      if (fromPath) return fromPath;

      const fromResultsPath = raw.match(/\/results?\/(\d{3,})/i)?.[1];
      if (fromResultsPath) return fromResultsPath;

      const fromMySubmissionsPath = raw.match(
        /\/my-submissions\/(\d{3,})/i
      )?.[1];
      if (fromMySubmissionsPath) return fromMySubmissionsPath;

      const fromQuery = raw.match(
        /[?&](?:submission_id|submissionId|result_id|resultId)=(\d{3,})/i
      )?.[1];
      if (fromQuery) return fromQuery;

      // Some pages expose single-submission views via query id.
      if (
        /\/(?:submission(?:s)?|results?|my-submissions)(?:\/|$|\?)/i.test(raw)
      ) {
        const genericId = raw.match(/[?&]id=(\d{3,})/i)?.[1];
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
        extractText('[class*="xngnso2"]', contextNode),
        extractText('h1', contextNode),
        extractText('h2', contextNode),
        extractText('[class*="problem"][class*="title"]', contextNode),
        problemLink ? extractText(problemLink) : null,
        problemId
      );

      let problemName = rawHeading;
      // Strip "Problem A1: " or "A1: " prefix from FB Hacker Cup problem titles
      if (
        problemName &&
        /^problem\s+[A-Z][0-9]*\s*[:.)-]\s+/i.test(problemName)
      ) {
        problemName = problemName
          .replace(/^problem\s+[A-Z][0-9]*\s*[:.)-]\s+/i, '')
          .trim();
      } else if (problemName && /^[A-Z][0-9]*\s*[:.)-]\s+/.test(problemName)) {
        problemName = problemName
          .replace(/^[A-Z][0-9]*\s*[:.)-]\s+/, '')
          .trim();
      }

      const currentProblemPathMatch = String(
        window.location.pathname || ''
      ).match(
        /(\/codingcompetitions\/hacker-cup\/[^?#]*?\/(?:problems?|tasks?)\/[^/?#]+)/i
      );
      const contextProblemUrl = currentProblemPathMatch?.[1]
        ? toAbsoluteUrl(currentProblemPathMatch[1])
        : null;

      const problemUrl =
        toAbsoluteUrl(problemHref) ||
        contextProblemUrl ||
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
        // Facebook Hacker Cup uses ._3-9a for the verdict badge text
        safeQuery('._3-9a', container),
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
        safeQuery('a[href*="/my-submissions/"]', row) ||
        safeQuery('a[href*="/my-submissions?"]', row) ||
        safeQuery('a[href*="/results/"]', row) ||
        safeQuery('a[href*="/results?"]', row) ||
        safeQuery('a[href*="submission"]', row);
      const submissionHref =
        submissionLink?.getAttribute('href') || submissionLink?.href || '';

      const datasetIdCandidate = firstNonEmpty(
        row?.getAttribute?.('data-submission-id'),
        row?.getAttribute?.('data-submissionid'),
        row?.getAttribute?.('data-result-id'),
        row?.getAttribute?.('data-resultid'),
        row?.getAttribute?.('data-id'),
        row?.id,
        row?.getAttribute?.('id')
      );

      const submissionId =
        this.getSubmissionIdFromValue(submissionHref) ||
        this.getSubmissionIdFromValue(datasetIdCandidate) ||
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
      safeQueryAll(
        'a[href*="/submissions/"], a[href*="/submissions?"], a[href*="/my-submissions/"], a[href*="/my-submissions?"], a[href*="/submission/"], a[href*="/submission?"], a[href*="/results/"], a[href*="/results?"], a[href*="submission_id="], a[href*="submissionId="], a[href*="result_id="], a[href*="resultId="]'
      ).forEach((anchor) => {
        const container =
          anchor.closest(
            'tr, li, article, [role="row"], [class*="submission"], [class*="row"]'
          ) || anchor;

        if (seen.has(container)) return;
        seen.add(container);
        containers.push(container);
      });

      return containers;
    }

    extractSubmissionsFromVirtualizedGrid(options = {}) {
      const expectedHandle = normalizeWhitespace(
        options.expectedHandle || ''
      ).toLowerCase();
      const shouldFilterByHandle = options.filterByHandle === true;

      const anchors = safeQueryAll(
        'a[href*="codingproblems/download/submission"][href*="submission_id="]'
      );
      if (anchors.length === 0) {
        return [];
      }

      const rowCellsByTop = new Map();
      safeQueryAll('div[style*="top:"][style*="left:"]').forEach((node) => {
        const topValue = Number.parseFloat(String(node?.style?.top || ''));
        if (!Number.isFinite(topValue)) {
          return;
        }

        const key = Math.round(topValue);
        if (!rowCellsByTop.has(key)) {
          rowCellsByTop.set(key, []);
        }
        rowCellsByTop.get(key).push(node);
      });

      const submissions = [];
      const seen = new Set();

      anchors.forEach((anchor) => {
        const href =
          String(anchor.getAttribute('href') || '').trim() ||
          String(anchor.href || '').trim();
        const submissionId = this.getSubmissionIdFromValue(href);
        if (!submissionId || seen.has(submissionId)) {
          return;
        }

        const cell =
          anchor.closest('div[style*="top:"][style*="left:"]') ||
          anchor.parentElement ||
          anchor;
        const topValue = Number.parseFloat(String(cell?.style?.top || ''));
        const topKey = Number.isFinite(topValue) ? Math.round(topValue) : null;
        const rowCells =
          topKey !== null ? rowCellsByTop.get(topKey) || [cell] : [cell];
        const rowText = normalizeWhitespace(
          rowCells.map((node) => extractText(node)).join(' ')
        );

        let parsed = this.extractSubmissionFromListRow(cell);
        if (!parsed || !parsed.submissionId) {
          const context = this.parseContestContext();
          const problemMeta = this.extractProblemMeta(document);

          const verdictText = firstNonEmpty(
            rowText.match(
              /(accepted|correct|wrong answer|failed|time limit exceeded|memory limit exceeded|runtime error|compilation error|pending|partial(?:ly)?)/i
            )?.[1],
            this.extractVerdictText(cell, rowText),
            'UNKNOWN'
          );

          const submittedAt =
            parseTimestampToIso(
              rowText.match(
                /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),\s+[a-z]+\s+\d{1,2},\s+\d{4},\s+\d{1,2}:\d{2}\s*(?:am|pm)?(?:\s*\(gmt[^\)]*\))?/i
              )?.[0] ||
                rowText.match(
                  /(\d{4}[-./]\d{1,2}[-./]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/
                )?.[1] ||
                rowText.match(
                  /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/
                )?.[1]
            ) || null;

          const submissionUrl =
            toAbsoluteUrl(href) ||
            `https://www.facebook.com/codingcompetitions/hacker-cup/submissions/${submissionId}`;

          parsed = {
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
            language: 'Unknown',
            executionTime: null,
            memoryUsed: null,
            submittedAt,
            sourceCode: null,
            contestId: context.contestId,
            roundName: firstNonEmpty(
              context.roundName,
              context.roundSlug,
              null
            ),
            problem_id: problemMeta.problemId,
            problem_name: firstNonEmpty(
              problemMeta.problemName,
              problemMeta.problemId
            ),
            problem_url: problemMeta.problemUrl,
            submission_id: String(submissionId),
            submission_url: submissionUrl,
            source_code: null,
            execution_time_ms: null,
            memory_kb: null,
            submitted_at: submittedAt,
            contest_id: context.contestId,
          };
        }

        if (shouldFilterByHandle && expectedHandle) {
          const rowHandle = normalizeWhitespace(
            parsed.handle || ''
          ).toLowerCase();
          if (rowHandle && rowHandle !== expectedHandle) {
            return;
          }
        }

        seen.add(submissionId);
        submissions.push(parsed);
      });

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
          /\/my-submissions(?:\/|$|[?#])|\/submissions?(?:\/|$|[?#])|\/results?(?:\/|$|[?#])|\/submissions-list(?:\/|$|[?#])|(?:[?&](?:view|tab|section)=(?:submissions?|results?|scoreboard))/i.test(
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
          /\/my-submissions(?:\/|$|[?#])|\/submissions?(?:\/|$|[?#])|\/results?(?:\/|$|[?#])|\/submissions-list(?:\/|$|[?#])|(?:[?&](?:view|tab|section)=(?:submissions?|results?|scoreboard))/i.test(
            absolute
          )
        );
      });

      if (fallback) {
        return fallback.absolute;
      }

      // Fallback synthesis when the page has no explicit links yet.
      try {
        const parsed = new URL(currentUrl);
        const contestBaseMatch = parsed.pathname.match(
          /\/codingcompetitions\/hacker-cup(?:\/\d{4}(?:\/[^/?#]+)?)?/i
        );
        const contestBasePath =
          contestBaseMatch?.[0] || '/codingcompetitions/hacker-cup';
        const normalizedBase = contestBasePath.replace(/\/+$/, '');
        const problemBaseMatch = parsed.pathname.match(
          /(\/codingcompetitions\/hacker-cup\/[^?#]*?\/(?:problems?|tasks?)\/[^/?#]+)/i
        );
        const problemBasePath = problemBaseMatch?.[1]
          ? problemBaseMatch[1].replace(/\/+$/, '')
          : null;

        const synthesizedPaths = [
          ...(problemBasePath ? [`${problemBasePath}/my-submissions`] : []),
          `${normalizedBase}/submissions`,
          `${normalizedBase}/results`,
        ];

        for (const path of synthesizedPaths) {
          const absolute = toAbsoluteUrl(path);
          if (absolute && absolute !== currentUrl) {
            return absolute;
          }
        }
      } catch {
        // Ignore malformed URL state.
      }

      return null;
    }

    hasPageUnavailableState() {
      const text = normalizeWhitespace(
        extractText(document.body)
      ).toLowerCase();
      if (!text) return false;

      const hasErrorPhrase =
        /content isn't available|this page isn't available|page isn't available|this content isn't available right now|link you followed may be broken|may have been removed/i.test(
          text
        );
      if (!hasErrorPhrase) return false;

      // Facebook sprinkles "content isn't available" phrases in chrome/boundaries
      // (dismissed dialogs, blocked thumbnails, etc.) even on fully-rendered pages.
      // Only treat the page as truly unavailable when there is no Hacker Cup
      // content, no coding-competition links, and no submission/problem DOM markers.
      const hasHackerCupContent =
        /hacker\s*cup|coding\s*competitions|round\s*\d|practice\s*round|my competition history/i.test(
          text
        );
      const hasHackerCupAnchors = Boolean(
        safeQuery(
          'a[href*="/codingcompetitions/hacker-cup"], a[href*="/codingcompetitions/profile"]'
        )
      );
      const hasProblemOrSubmissionMarkers = Boolean(
        safeQuery(
          'a[href*="/problems/"], a[href*="/submissions/"], a[href*="/my-submissions/"], a[href*="/results/"], ._3-9a, [class*="xngnso2"]'
        )
      );

      if (
        hasHackerCupContent ||
        hasHackerCupAnchors ||
        hasProblemOrSubmissionMarkers
      ) {
        return false;
      }

      return true;
    }

    toSyntheticToken(value, fallback = 'item') {
      const raw = String(value || '')
        .trim()
        .toLowerCase();
      const token = raw.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      return token || fallback;
    }

    inferProblemAttemptStatus(container, problemLink) {
      const hostNode = container || problemLink || document.body;
      const indicatorNodes = safeQueryAll(
        '[class*="status"], [class*="result"], [class*="score"], [class*="badge"], [class*="verdict"], [aria-label*="status" i], [aria-label*="result" i], [title*="accepted" i], [title*="wrong" i], [title*="submitted" i], [title*="pending" i], ._3-9a',
        hostNode
      ).slice(0, 20);

      const statusChunks = [];
      const pushChunk = (value) => {
        const text = normalizeWhitespace(value).toLowerCase();
        if (!text) return;
        statusChunks.push(text);
      };

      pushChunk(extractText(hostNode));
      pushChunk(hostNode?.getAttribute?.('aria-label'));
      pushChunk(hostNode?.getAttribute?.('title'));
      pushChunk(hostNode?.className);
      pushChunk(problemLink?.getAttribute?.('aria-label'));
      pushChunk(problemLink?.getAttribute?.('title'));
      pushChunk(problemLink?.className);

      indicatorNodes.forEach((node) => {
        pushChunk(extractText(node));
        pushChunk(node?.getAttribute?.('aria-label'));
        pushChunk(node?.getAttribute?.('title'));
        pushChunk(node?.className);
      });

      const signal = statusChunks.join(' ');

      const hasStatusClassSignal =
        /status|result|score|badge|verdict|solved|attempt|success|wrong|pending|partial|full|zero/.test(
          `${String(hostNode?.className || '').toLowerCase()} ${String(problemLink?.className || '').toLowerCase()}`
        );

      if (indicatorNodes.length === 0 && !hasStatusClassSignal) {
        return null;
      }

      const isSolved =
        /accepted|correct|solved|passed|complete(?:d)?|success|full(?:\s+score)?|\bac\b|checkmark|✓|✔/.test(
          signal
        ) && !/not\s+solved|unsolved|failed|wrong\s+answer/.test(signal);

      const isPending =
        /pending|queue|judg|running|in\s*progress|processing/.test(signal) &&
        !isSolved;

      const isTried =
        isSolved ||
        isPending ||
        /attempt(?:ed)?|tried|submitted|wrong|failed|incorrect|partial|zero(?:\s+score)?|\bwa\b/.test(
          signal
        );

      if (!isTried) {
        return null;
      }

      if (isSolved) {
        return { statusType: 'solved', verdict: 'AC' };
      }

      if (isPending) {
        return { statusType: 'pending', verdict: 'PENDING' };
      }

      return { statusType: 'tried', verdict: 'WA' };
    }

    extractContestLinksForCrawl() {
      const links = [];
      const seen = new Set();

      const isProfilePage = /\/codingcompetitions\/profile(?:\/|$)/i.test(
        String(window.location.pathname || '')
      );

      const isTargetRoundOrProblemPath = (pathname) => {
        const path = String(pathname || '').toLowerCase();
        if (!path.includes('/codingcompetitions/hacker-cup/')) {
          return false;
        }

        // Keep traversal narrow on profile pages:
        // year/round pages and problem/task pages only.
        return /\/codingcompetitions\/hacker-cup\/\d{4}\/[^/?#]+(?:\/|$)/i.test(
          pathname
        );
      };

      const addLink = (candidateUrl) => {
        const value = normalizeCompetitionCrawlerUrl(candidateUrl);
        if (!value || seen.has(value)) {
          return;
        }

        if (isProfilePage) {
          try {
            const parsed = new URL(value);
            const pathname = String(parsed.pathname || '');
            if (!isTargetRoundOrProblemPath(pathname)) {
              return;
            }
          } catch {
            return;
          }
        }

        if (seen.has(value)) {
          return;
        }
        seen.add(value);
        links.push(value);
      };

      const currentAbsolute = normalizeCompetitionCrawlerUrl(
        window.location.href
      );
      if (currentAbsolute) {
        try {
          const parsedCurrent = new URL(currentAbsolute);
          const currentPathname = String(parsedCurrent.pathname || '');
          const currentPath = currentPathname.toLowerCase();

          if (
            /facebook\.com$/i.test(parsedCurrent.hostname) ||
            /\.facebook\.com$/i.test(parsedCurrent.hostname)
          ) {
            if (currentPath.includes('/codingcompetitions/hacker-cup')) {
              addLink(parsedCurrent.toString().split('#')[0]);

              const problemBaseMatch = currentPathname.match(
                /(\/codingcompetitions\/hacker-cup\/[^?#]*?\/(?:problems?|tasks?)\/[^/?#]+)/i
              );
              const problemBasePath = problemBaseMatch?.[1]
                ? problemBaseMatch[1].replace(/\/+$/, '')
                : null;
              if (problemBasePath) {
                const mySubmissionsUrl = toAbsoluteUrl(
                  `${problemBasePath}/my-submissions`
                );
                if (mySubmissionsUrl) {
                  addLink(mySubmissionsUrl.split('#')[0]);
                }
              }
            }
          }
        } catch {
          // Ignore malformed current URL.
        }
      }

      safeQueryAll('a[href]').forEach((anchor) => {
        const rawHref = String(anchor.getAttribute('href') || '').trim();
        if (
          !rawHref ||
          rawHref.startsWith('#') ||
          /^javascript:/i.test(rawHref)
        ) {
          return;
        }

        const absolute = normalizeCompetitionCrawlerUrl(rawHref);
        if (!absolute) {
          return;
        }

        let parsed;
        try {
          parsed = new URL(absolute);
        } catch {
          return;
        }

        const full = parsed.toString().split('#')[0];
        const pathname = String(parsed.pathname || '');
        const path = pathname.toLowerCase();
        const search = String(parsed.search || '').toLowerCase();
        if (
          !/facebook\.com$/i.test(parsed.hostname) &&
          !/\.facebook\.com$/i.test(parsed.hostname)
        ) {
          return;
        }
        if (!path.includes('/codingcompetitions/hacker-cup')) {
          return;
        }

        if (/\/certificate(?:\/|$|\?)/i.test(pathname)) {
          return;
        }

        const isProblemPage = /\/(?:problems?|tasks?)\/[^/?#]+(?:\/|$)/i.test(
          pathname
        );
        const isMySubmissionsPage =
          /\/(?:problems?|tasks?)\/[^/?#]+\/my-submissions(?:\/|$|\?)/i.test(
            pathname
          );
        const isSubmissionDetailPage =
          /\/(?:submission|submissions|result|results)\/\d{3,}(?:\/|$|\?)/i.test(
            pathname
          ) ||
          /[?&](?:submission_id|submissionId|result_id|resultId|id)=\d{3,}/i.test(
            search
          );

        if (isSubmissionDetailPage) {
          return;
        }

        const isContestPage =
          /\/codingcompetitions\/hacker-cup(?:\/\d{4}(?:\/[^/?#]+)?)?(?:\/|$)/i.test(
            pathname
          );

        if (!isContestPage && !isProblemPage && !isMySubmissionsPage) {
          return;
        }

        if (isProfilePage) {
          const contextNode =
            anchor.closest(
              'tr, li, article, section, [role="row"], [role="listitem"], div'
            ) ||
            anchor.parentElement ||
            anchor;
          const contextText = normalizeWhitespace(
            extractText(contextNode)
          ).toLowerCase();

          const scoreMatch = contextText.match(
            /\b(\d{1,3})\s*\/\s*(\d{1,3})\b/
          );
          if (scoreMatch) {
            const solved = Number.parseInt(scoreMatch[1], 10);
            const total = Number.parseInt(scoreMatch[2], 10);
            if (
              Number.isFinite(total) &&
              total > 0 &&
              (!Number.isFinite(solved) || solved <= 0)
            ) {
              return;
            }
          }
        }

        addLink(full);

        if (isProblemPage && !isMySubmissionsPage) {
          const problemBaseMatch = pathname.match(
            /(\/codingcompetitions\/hacker-cup\/[^?#]*?\/(?:problems?|tasks?)\/[^/?#]+)/i
          );
          const problemBasePath = problemBaseMatch?.[1]
            ? problemBaseMatch[1].replace(/\/+$/, '')
            : null;
          if (problemBasePath) {
            const mySubmissionsUrl = toAbsoluteUrl(
              `${problemBasePath}/my-submissions`
            );
            if (mySubmissionsUrl) {
              addLink(mySubmissionsUrl.split('#')[0]);
            }
          }
        }
      });

      safeQueryAll('[href]').forEach((node) => {
        const tagName = String(node?.tagName || '').toLowerCase();
        if (tagName === 'a') {
          return;
        }

        const rawHref = String(node.getAttribute('href') || '').trim();
        if (!rawHref || !/codingcompetitions/i.test(rawHref)) {
          return;
        }

        addLink(rawHref);
      });

      safeQueryAll('[data-href], [data-url], [data-lynx-uri]').forEach(
        (node) => {
          const candidates = [
            node.getAttribute('data-href'),
            node.getAttribute('data-url'),
            node.getAttribute('data-lynx-uri'),
          ];

          candidates.forEach((candidate) => {
            const value = String(candidate || '').trim();
            if (!value) {
              return;
            }

            if (
              !/codingcompetitions|facebook\.com\/l\.php|codingcompetitions%2F/i.test(
                value
              )
            ) {
              return;
            }

            addLink(value);
          });
        }
      );

      if (!isProfilePage) {
        const html = String(document.documentElement?.innerHTML || '')
          .replace(/\\\//g, '/')
          .replace(/\\u002[fF]/g, '/')
          .replace(/\\x2[fF]/g, '/');
        const roundUrlRegex =
          /https?:\/\/(?:www\.|m\.|web\.)?facebook\.com\/codingcompetitions\/hacker-cup\/\d{4}\/[a-z0-9_-]+(?:\/|$|[?#])/gi;
        let roundUrlMatch;
        let roundUrlGuards = 0;
        while (
          (roundUrlMatch = roundUrlRegex.exec(html)) != null &&
          roundUrlGuards < 400
        ) {
          roundUrlGuards += 1;

          const roundUrl = String(roundUrlMatch[0] || '')
            .trim()
            .replace(/[?#].*$/, '')
            .replace(/\/+$/, '');

          if (!roundUrl) {
            continue;
          }

          addLink(roundUrl);
        }

        const encodedRoundUrlRegex =
          /https%3A%2F%2F(?:www\.|m\.|web\.)?facebook\.com%2Fcodingcompetitions%2Fhacker-cup%2F\d{4}%2F[a-z0-9_-]+(?:%2F|%3F|%23|$)/gi;
        let encodedRoundMatch;
        let encodedRoundGuards = 0;
        while (
          (encodedRoundMatch = encodedRoundUrlRegex.exec(html)) != null &&
          encodedRoundGuards < 400
        ) {
          encodedRoundGuards += 1;

          const encodedRoundUrl = String(encodedRoundMatch[0] || '').trim();
          if (!encodedRoundUrl) {
            continue;
          }

          const decodedRoundUrl = decodeUriComponentSafe(encodedRoundUrl)
            .replace(/[?#].*$/, '')
            .replace(/\/+$/, '');
          addLink(decodedRoundUrl);
        }

        const roundPathRegex =
          /\/codingcompetitions\/hacker-cup\/\d{4}\/[a-z0-9_-]+(?:\/|$|[?#])/gi;
        let roundMatch;
        let roundGuards = 0;
        while (
          (roundMatch = roundPathRegex.exec(html)) != null &&
          roundGuards < 400
        ) {
          roundGuards += 1;

          const roundPath = String(roundMatch[0] || '')
            .trim()
            .replace(/[?#].*$/, '')
            .replace(/\/+$/, '');

          if (!roundPath) {
            continue;
          }

          if (/\/(?:problems?|tasks?)\//i.test(roundPath)) {
            continue;
          }

          const roundUrl = toAbsoluteUrl(roundPath);
          if (roundUrl) {
            addLink(roundUrl.split('#')[0]);
          }
        }

        const problemPathRegex =
          /\/codingcompetitions\/hacker-cup\/\d{4}\/[^"'\s<]+\/(?:problems?|tasks?)\/[^"'\s<]+/gi;
        let match;
        let guards = 0;
        while ((match = problemPathRegex.exec(html)) != null && guards < 300) {
          guards += 1;

          const problemPath = String(match[0] || '').trim();
          if (!problemPath) {
            continue;
          }

          const problemUrl = toAbsoluteUrl(problemPath);
          if (problemUrl) {
            addLink(problemUrl.split('#')[0]);
          }

          const normalizedProblemPath = problemPath.replace(/\/+$/, '');
          const mySubmissionsUrl = toAbsoluteUrl(
            `${normalizedProblemPath}/my-submissions`
          );
          if (mySubmissionsUrl) {
            addLink(mySubmissionsUrl.split('#')[0]);
          }
        }
      }

      return links;
    }

    parseNumericToken(value) {
      const raw = String(value || '')
        .trim()
        .replace(/,/g, '');
      if (!raw) return null;

      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) ? parsed : null;
    }

    async primeDynamicContent(pageType = 'contest') {
      const shouldScroll =
        pageType === 'contest' ||
        pageType === 'problem' ||
        pageType === 'submissions';
      if (!shouldScroll) {
        return;
      }

      const isProfilePage = /\/codingcompetitions\/profile(?:\/|$)/i.test(
        String(window.location.pathname || '')
      );

      const clickCompetitionHistoryExpanders = () => {
        if (!isProfilePage) {
          return;
        }

        let clicks = 0;
        const maxClicks = 8;
        const candidates = safeQueryAll(
          'button, [role="button"], [aria-expanded="false"]'
        );

        candidates.forEach((node) => {
          if (clicks >= maxClicks) {
            return;
          }

          const label = normalizeWhitespace(
            [
              extractText(node),
              node?.getAttribute?.('aria-label') || '',
              node?.getAttribute?.('title') || '',
            ].join(' ')
          ).toLowerCase();
          if (!label) {
            return;
          }

          const isHistoryControl =
            /competition\s*history|hacker\s*cup|coding\s*competitions|round/.test(
              label
            );
          const isMoreControl =
            /see\s*more|show\s*more|view\s*more|load\s*more/.test(label);

          if (!isHistoryControl && !isMoreControl) {
            return;
          }

          if (isMoreControl && !isHistoryControl) {
            const contextNode = node.closest('section, article, div, main');
            const contextText = normalizeWhitespace(
              extractText(contextNode || document.body)
            ).toLowerCase();
            if (
              !/competition\s*history|hacker\s*cup|coding\s*competitions|round/.test(
                contextText
              )
            ) {
              return;
            }
          }

          try {
            node.dispatchEvent(
              new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
              })
            );
            clicks += 1;
          } catch {
            // Ignore click failures.
          }
        });
      };

      const getScrollableContainers = () => {
        return safeQueryAll('div, section, article, main')
          .filter((node) => {
            try {
              const style = window.getComputedStyle(node);
              const overflowY = String(style?.overflowY || '').toLowerCase();
              const canScroll =
                Number(node.scrollHeight || 0) -
                  Number(node.clientHeight || 0) >
                80;
              const isScrollableOverflow =
                overflowY === 'auto' ||
                overflowY === 'scroll' ||
                overflowY === 'overlay';
              return canScroll && isScrollableOverflow;
            } catch {
              return false;
            }
          })
          .slice(0, 8);
      };

      let previousHeight = 0;
      let previousSignature = '';
      for (let i = 0; i < 10; i++) {
        const currentHeight = Math.max(
          Number(document.body?.scrollHeight || 0),
          Number(document.documentElement?.scrollHeight || 0)
        );

        previousHeight = currentHeight;

        clickCompetitionHistoryExpanders();

        const scrollContainers = getScrollableContainers();
        scrollContainers.forEach((container) => {
          try {
            container.scrollTop = Number(container.scrollHeight || 0);
          } catch {
            // Ignore container scroll failures.
          }
        });

        try {
          window.scrollTo(0, currentHeight);
        } catch {
          // Ignore scroll failures in restricted contexts.
        }

        await sleep(420);

        const contestAnchorsCount = safeQueryAll(
          'a[href*="/codingcompetitions/hacker-cup/"]'
        ).length;
        const containersHeightSignature = scrollContainers
          .map((container) => Number(container.scrollHeight || 0))
          .join(',');
        const signature = `${currentHeight}|${contestAnchorsCount}|${containersHeightSignature}`;

        if (
          i > 2 &&
          signature === previousSignature &&
          currentHeight <= previousHeight
        ) {
          break;
        }

        previousSignature = signature;
      }

      try {
        window.scrollTo(0, 0);
      } catch {
        // Ignore scroll failures in restricted contexts.
      }
      await sleep(120);
    }

    extractProfileContestStatuses() {
      // The profile page lists rounds the user participated in with aggregate
      // scores like "19/105" — that doesn't identify specific AC'd problems.
      // Per-problem verdicts are determined by visiting each problem page
      // (see extractProblemAttemptStatuses). Round URLs for crawling are
      // collected via extractContestLinksForCrawl().
      return [];
    }

    extractProblemAttemptStatuses(options = {}) {
      const context = this.parseContestContext();
      const expectedHandle = normalizeWhitespace(
        options.expectedHandle || options.handle || ''
      );

      const rowsByProblem = new Map();

      // If we're already on a problem page, synthesize from current page verdict
      const currentPageType = this.detectPageType();
      if (currentPageType === 'problem') {
        const currentProblemId = this.getProblemFromUrl(window.location.href);
        if (currentProblemId) {
          const verdictText = this.extractVerdictText(document);
          if (verdictText) {
            const normalized = normalizeVerdict(verdictText);
            if (normalized !== 'UNKNOWN') {
              const linkContext = this.parseContestContext();
              const contestId = firstNonEmpty(
                linkContext.contestId,
                'hacker-cup'
              );
              const contestToken = this.toSyntheticToken(contestId, 'contest');
              const problemToken = this.toSyntheticToken(
                currentProblemId,
                'problem'
              );
              const statusType =
                normalized === 'AC'
                  ? 'solved'
                  : normalized === 'PENDING'
                    ? 'pending'
                    : 'tried';
              const syntheticId = `fbhc_problem_${contestToken}_${problemToken}_${statusType}`;
              const problemMeta = this.extractProblemMeta(document);
              rowsByProblem.set(`${contestId}::${currentProblemId}`, {
                priority:
                  statusType === 'solved'
                    ? 3
                    : statusType === 'pending'
                      ? 2
                      : 1,
                submission: {
                  platform: this.platform,
                  handle: expectedHandle || null,
                  problemId: currentProblemId,
                  problemName: firstNonEmpty(
                    problemMeta.problemName,
                    currentProblemId
                  ),
                  problemUrl: toAbsoluteUrl(window.location.pathname),
                  submissionId: syntheticId,
                  submissionUrl: null,
                  verdict: normalized,
                  language: 'Unknown',
                  executionTime: null,
                  memoryUsed: null,
                  submittedAt: null,
                  sourceCode: null,
                  contestId,
                  roundName: firstNonEmpty(linkContext.roundName, null),
                  problem_id: currentProblemId,
                  problem_name: firstNonEmpty(
                    problemMeta.problemName,
                    currentProblemId
                  ),
                  problem_url: toAbsoluteUrl(window.location.pathname),
                  submission_id: syntheticId,
                  submission_url: null,
                  source_code: null,
                  execution_time_ms: null,
                  memory_kb: null,
                  submitted_at: null,
                  synthetic_submission: true,
                  syntheticSubmission: true,
                  status_type: statusType,
                  statusType,
                },
              });
            }
          }
        }
      }

      safeQueryAll('a[href*="/problems/"], a[href*="/tasks/"]').forEach(
        (problemLink) => {
          const href =
            String(problemLink.getAttribute('href') || '').trim() ||
            String(problemLink.href || '').trim();
          if (!href) return;

          const problemUrl = toAbsoluteUrl(href);
          if (!problemUrl) return;

          const problemId = this.getProblemFromUrl(problemUrl);
          if (!problemId) return;

          const row =
            problemLink.closest(
              'tr, li, article, [role="row"], [class*="problem"], [class*="task"], [class*="challenge"]'
            ) ||
            problemLink.parentElement ||
            problemLink;

          const inferred = this.inferProblemAttemptStatus(row, problemLink);
          if (!inferred) return;

          const linkContext = this.parseContestContext(problemUrl);
          const contestId = firstNonEmpty(
            linkContext.contestId,
            context.contestId,
            'hacker-cup'
          );

          const problemName = firstNonEmpty(
            extractText(problemLink),
            problemId
          );
          const contestToken = this.toSyntheticToken(contestId, 'contest');
          const problemToken = this.toSyntheticToken(problemId, 'problem');
          const syntheticId = `fbhc_problem_${contestToken}_${problemToken}_${inferred.statusType}`;

          const key = `${contestId}::${problemId}`;
          const priority =
            inferred.statusType === 'solved'
              ? 3
              : inferred.statusType === 'pending'
                ? 2
                : 1;

          const existing = rowsByProblem.get(key);
          if (existing && existing.priority >= priority) {
            return;
          }

          rowsByProblem.set(key, {
            priority,
            submission: {
              platform: this.platform,
              handle: expectedHandle || null,
              problemId,
              problemName,
              problemUrl,
              submissionId: syntheticId,
              submissionUrl: null,
              verdict: inferred.verdict,
              language: 'Unknown',
              executionTime: null,
              memoryUsed: null,
              submittedAt: null,
              sourceCode: null,
              contestId,
              roundName: firstNonEmpty(
                linkContext.roundName,
                context.roundName,
                null
              ),
              problem_id: problemId,
              problem_name: problemName,
              problem_url: problemUrl,
              submission_id: syntheticId,
              submission_url: null,
              source_code: null,
              execution_time_ms: null,
              memory_kb: null,
              submitted_at: null,
              synthetic_submission: true,
              syntheticSubmission: true,
              status_type: inferred.statusType,
              statusType: inferred.statusType,
            },
          });
        }
      );

      return Array.from(rowsByProblem.values()).map(
        (entry) => entry.submission
      );
    }

    extractSubmissionsFromHtmlSnapshot(options = {}) {
      const htmlRaw = String(document.documentElement?.innerHTML || '');
      const html = htmlRaw.replace(/\\\//g, '/');
      if (!html) {
        return [];
      }

      const submissions = [];
      const seen = new Set();
      const expectedHandle = normalizeWhitespace(
        options.expectedHandle || ''
      ).toLowerCase();

      const regex =
        /(\/codingcompetitions\/hacker-cup[^"'\s<]*?\/(?:submission|submissions|result|results|my-submissions)(?:\/(\d{3,}))?(?:\?[^"'\s<]*?(?:submission_id|submissionId|result_id|resultId|id)=(\d{3,}))?)/gi;
      let match;

      while ((match = regex.exec(html)) != null && submissions.length < 800) {
        const submissionPath = String(match[1] || '').trim();
        const start = Math.max(0, match.index - 700);
        const end = Math.min(html.length, match.index + 900);
        const chunk = html.slice(start, end);

        const submissionId = String(
          firstNonEmpty(
            match[2],
            match[3],
            chunk.match(
              /(?:submission(?:_?id|Id)|result(?:_?id|Id))["':=\s]+(\d{3,})/i
            )?.[1],
            ''
          )
        ).trim();
        if (!submissionId || seen.has(submissionId)) {
          continue;
        }

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

        const submissionUrl =
          toAbsoluteUrl(submissionPath) ||
          (submissionPath
            ? `https://www.facebook.com${submissionPath}`
            : `https://www.facebook.com/codingcompetitions/hacker-cup/submissions/${submissionId}`);
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

      let currentPage = null;
      let currentPageParam = null;
      try {
        const parsedCurrent = new URL(currentUrl);
        if (parsedCurrent.searchParams.has('page')) {
          currentPageParam = 'page';
        } else if (parsedCurrent.searchParams.has('p')) {
          currentPageParam = 'p';
        } else if (parsedCurrent.searchParams.has('offset')) {
          currentPageParam = 'offset';
        }

        if (currentPageParam) {
          const rawCurrent = parsedCurrent.searchParams.get(currentPageParam);
          const parsed = Number.parseInt(String(rawCurrent || ''), 10);
          if (Number.isFinite(parsed)) {
            currentPage = parsed;
          }
        }
      } catch {
        // Ignore malformed current URL.
      }

      let bestUrl = null;
      let bestPage = Number.POSITIVE_INFINITY;
      let fallbackUrl = null;

      let bestPagedUrl = null;
      let bestPagedPage = Number.POSITIVE_INFINITY;

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

        if (!/facebook\.com\/codingcompetitions\/hacker-cup/i.test(absolute)) {
          return;
        }

        const text = extractText(anchor).toLowerCase();
        const rel = String(anchor.getAttribute('rel') || '').toLowerCase();
        const title = String(anchor.getAttribute('title') || '').toLowerCase();
        const ariaLabel = String(
          anchor.getAttribute('aria-label') || ''
        ).toLowerCase();

        const labelText = `${text} ${title} ${ariaLabel}`.trim();

        const isNextLike =
          rel.includes('next') ||
          /(^|\s)(next|newer|>|>>|›|»)(\s|$)/i.test(text) ||
          /next/i.test(title) ||
          /next/i.test(ariaLabel);

        try {
          const parsed = new URL(absolute);
          const pageRaw =
            parsed.searchParams.get('page') ||
            parsed.searchParams.get('p') ||
            parsed.searchParams.get('offset') ||
            '';

          const page = Number.parseInt(String(pageRaw || ''), 10);

          if (isNextLike) {
            if (!fallbackUrl) {
              fallbackUrl = absolute;
            }

            if (!Number.isFinite(page)) {
              bestUrl = bestUrl || absolute;
              return;
            }

            const shouldTake =
              currentPage === null
                ? page >= 2 && page < bestPage
                : page > currentPage && page < bestPage;

            if (shouldTake) {
              bestPage = page;
              bestUrl = absolute;
            }

            return;
          }

          if (!Number.isFinite(page)) {
            return;
          }

          const shouldTakePaged =
            currentPage === null
              ? page >= 2 && page < bestPagedPage
              : page > currentPage && page < bestPagedPage;

          if (shouldTakePaged) {
            bestPagedPage = page;
            bestPagedUrl = absolute;
          }
        } catch {
          // Ignore malformed next-page URLs.
        }
      });

      if (bestUrl || fallbackUrl) {
        return bestUrl || fallbackUrl;
      }

      if (bestPagedUrl) {
        return bestPagedUrl;
      }

      if (currentPage !== null && currentPageParam) {
        try {
          const parsedCurrent = new URL(currentUrl);
          parsedCurrent.searchParams.set(
            currentPageParam,
            String(currentPage + 1)
          );
          const nextUrl = parsedCurrent.toString();
          return nextUrl !== currentUrl ? nextUrl : null;
        } catch {
          return null;
        }
      }

      return null;
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

      if (
        safeQuery(
          'a[href*="/submissions/"], a[href*="/submissions?"], a[href*="/results/"], a[href*="/results?"], a[href*="submission_id="], a[href*="submissionId="]'
        )
      ) {
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
        const virtualizedSubmissions =
          this.extractSubmissionsFromVirtualizedGrid({
            expectedHandle,
            filterByHandle: shouldFilterByHandle,
          });
        if (virtualizedSubmissions.length > 0) {
          return virtualizedSubmissions;
        }

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
        if (this.hasPageUnavailableState()) {
          sendResponse({
            success: false,
            nonRetriable: true,
            error:
              'Current Hacker Cup URL is unavailable. Open a valid results/submissions page while signed in.',
          });
          return;
        }

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

    async handleExtractProblemStatusesMessage(request, sendResponse) {
      try {
        if (this.hasPageUnavailableState()) {
          sendResponse({
            success: false,
            nonRetriable: true,
            error:
              'Current Hacker Cup URL is unavailable. Open https://www.facebook.com/codingcompetitions/profile or a Hacker Cup round/problem page while signed in.',
          });
          return;
        }

        await waitForElement('body', 4500).catch(() => null);
        await sleep(250);

        const pageType = this.detectPageType();

        await this.primeDynamicContent(pageType);

        const directSubmissions =
          pageType === 'submissions'
            ? this.extractSubmissionsFromPage({
                expectedHandle: request?.handle,
                handle: request?.handle,
                filterByHandle: false,
              })
            : [];

        const statusSubmissions = this.extractProblemAttemptStatuses({
          expectedHandle: request?.handle,
          handle: request?.handle,
        });

        const profileSubmissions = this.extractProfileContestStatuses({
          expectedHandle: request?.handle,
          handle: request?.handle,
        });

        const merged = new Map();
        const mergedEntries = [
          ...directSubmissions,
          ...statusSubmissions,
          ...profileSubmissions,
        ];

        mergedEntries.forEach((entry) => {
          if (!entry || typeof entry !== 'object') {
            return;
          }

          const explicitId = firstNonEmpty(
            entry?.submissionId,
            entry?.submission_id,
            null
          );
          const fallbackId = `${firstNonEmpty(entry?.contestId, entry?.contest_id, 'contest')}::${firstNonEmpty(entry?.problemId, entry?.problem_id, 'problem')}::${firstNonEmpty(entry?.statusType, entry?.status_type, 'entry')}`;
          const key = String(firstNonEmpty(explicitId, fallbackId)).trim();
          if (!key) {
            return;
          }

          if (!merged.has(key)) {
            merged.set(key, entry);
            return;
          }

          const existing = merged.get(key);
          const existingSynthetic =
            existing?.synthetic_submission === true ||
            existing?.syntheticSubmission === true;
          const currentSynthetic =
            entry?.synthetic_submission === true ||
            entry?.syntheticSubmission === true;

          if (existingSynthetic && !currentSynthetic) {
            merged.set(key, entry);
          }
        });

        const submissions = Array.from(merged.values());
        const contestLinks = this.extractContestLinksForCrawl();
        const isProfilePage = /\/codingcompetitions\/profile(?:\/|$)/i.test(
          String(window.location.pathname || '')
        );
        const actionableContestLinks = contestLinks.filter((link) =>
          /\/codingcompetitions\/hacker-cup\//i.test(String(link || ''))
        );

        if (
          isProfilePage &&
          submissions.length === 0 &&
          actionableContestLinks.length === 0
        ) {
          sendResponse({
            success: false,
            pending: true,
            error:
              'Competition History section is still loading. Scroll profile a bit and retrying...',
          });
          return;
        }

        sendResponse({
          success: true,
          data: {
            submissions,
            contestLinks,
            currentUrl: window.location.href,
          },
          error: null,
        });
      } catch (error) {
        sendResponse({
          success: false,
          error:
            error?.message || 'Failed to extract Hacker Cup problem statuses',
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

          if (request?.action === 'extractProblemStatuses') {
            this.handleExtractProblemStatusesMessage(request, sendResponse);
            return true;
          }

          if (request?.action === 'ping') {
            sendResponse({
              success: true,
              platform: this.platform,
              pageType: this.detectPageType(),
              initialized: this.initialized,
              pageUnavailable: this.hasPageUnavailableState(),
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
