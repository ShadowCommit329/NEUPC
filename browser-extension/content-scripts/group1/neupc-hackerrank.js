/**
 * NEUPC HackerRank Extractor (Standalone)
 * Supports:
 * - Single submission extraction from challenge submission pages
 * - Background-triggered extraction via runtime messages
 * - Problem details extraction from challenge pages
 */

(function () {
  'use strict';

  if (window.__NEUPC_HACKERRANK_INJECTED__) {
    return;
  }
  window.__NEUPC_HACKERRANK_INJECTED__ = true;

  const PLATFORM = 'hackerrank';
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

  function normalizeVerdict(verdict) {
    if (!verdict) return 'UNKNOWN';
    const v = String(verdict).toUpperCase().trim();

    if (
      v.includes('ACCEPTED') ||
      v === 'AC' ||
      v === 'OK' ||
      v.includes('PASSED') ||
      v.includes('SUCCESS')
    ) {
      return 'AC';
    }
    if (
      v.includes('PARTIAL') ||
      v.includes('PARTIALLY ACCEPTED') ||
      v === 'PA' ||
      v === 'PC'
    ) {
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
    if (
      v.includes('COMPILATION ERROR') ||
      v === 'CE' ||
      v.includes('COMPILE ERROR')
    ) {
      return 'CE';
    }
    if (
      v.includes('PENDING') ||
      v.includes('QUEUE') ||
      v.includes('RUNNING') ||
      v.includes('PROCESSING')
    ) {
      return 'PENDING';
    }

    return v;
  }

  function parseTimestampToIso(value) {
    const text = normalizeWhitespace(value);
    if (!text) return null;

    if (/^\d+$/.test(text)) {
      const numeric = Number.parseInt(text, 10);
      if (!Number.isFinite(numeric)) return null;

      const millis =
        text.length <= 10
          ? numeric * 1000
          : Number.parseInt(text.slice(0, 13), 10);
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
        if (Number.isFinite(dt.getTime())) return dt.toISOString();
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
        if (Number.isFinite(dt.getTime())) return dt.toISOString();
      }
    }

    return null;
  }

  function parseDurationToMs(value) {
    const text = normalizeWhitespace(value).toLowerCase();
    if (!text) return null;

    const match = text.match(
      /([0-9]*\.?[0-9]+)\s*(ms|msec|millisecond(?:s)?|s|sec|second(?:s)?)?/
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
    if (unit === 'kb') return Math.round(amount);
    if (unit === 'b') return Math.round(amount / 1024);

    return Math.round(amount);
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

    const signalPatterns = [
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

  function getValueByPath(obj, path) {
    if (!obj || typeof obj !== 'object' || !path) return undefined;
    const parts = String(path).split('.').filter(Boolean);
    let current = obj;
    for (const part of parts) {
      if (!current || typeof current !== 'object') return undefined;
      current = current[part];
    }
    return current;
  }

  function firstDefinedByPaths(obj, paths) {
    for (const path of paths) {
      const value = getValueByPath(obj, path);
      if (value !== undefined && value !== null) {
        return value;
      }
    }
    return undefined;
  }

  function toStringValue(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return null;
  }

  class HackerRankExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
      this.messageListenerAttached = false;
    }

    detectPageType() {
      const path = window.location.pathname;

      if (/\/submissions\//i.test(path)) {
        return 'submission';
      }
      if (/\/challenges\//i.test(path)) {
        return 'problem';
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
        path.match(/\/submissions\/(?:code\/)?([^/?#]+)/i)?.[1] ||
        parsed.searchParams.get('submission_id') ||
        null;

      const challengeSlug = path.match(/\/challenges\/([^/?#]+)/i)?.[1] || null;
      const contestSlug =
        path.match(/\/(?:rest\/)?contests\/([^/?#]+)\/challenges\//i)?.[1] ||
        null;

      return {
        parsed,
        path,
        submissionId: submissionId ? String(submissionId) : null,
        challengeSlug,
        contestSlug,
      };
    }

    buildChallengeUrl(challengeSlug, contestSlug = null) {
      const slug = normalizeWhitespace(challengeSlug);
      if (!slug) return null;

      const contest = normalizeWhitespace(contestSlug || '');
      if (contest && contest.toLowerCase() !== 'master') {
        return `https://www.hackerrank.com/contests/${encodeURIComponent(contest)}/challenges/${encodeURIComponent(slug)}/problem`;
      }

      return `https://www.hackerrank.com/challenges/${encodeURIComponent(slug)}/problem`;
    }

    buildSubmissionApiCandidates(context) {
      const candidates = [];
      const seen = new Set();

      const addCandidate = (candidateUrl) => {
        const normalized = String(candidateUrl || '').trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        candidates.push(normalized);
      };

      if (
        context.path &&
        /\/rest\/contests\//i.test(context.path) &&
        context.submissionId
      ) {
        addCandidate(`https://www.hackerrank.com${context.path.replace(/\/+$/, '')}`);
      }

      if (context.challengeSlug && context.submissionId) {
        const contestCandidates = [];
        if (context.contestSlug) {
          contestCandidates.push(context.contestSlug);
        }
        if (!contestCandidates.some((item) => item.toLowerCase() === 'master')) {
          contestCandidates.push('master');
        }

        contestCandidates.forEach((contestSlug) => {
          addCandidate(
            `https://www.hackerrank.com/rest/contests/${encodeURIComponent(contestSlug)}/challenges/${encodeURIComponent(context.challengeSlug)}/submissions/${encodeURIComponent(context.submissionId)}`
          );
        });

        addCandidate(
          `https://www.hackerrank.com/rest/challenges/${encodeURIComponent(context.challengeSlug)}/submissions/${encodeURIComponent(context.submissionId)}`
        );
      }

      return candidates;
    }

    async getUserHandle() {
      const profileLink = safeQuery('a[href^="/profile/"], a[href*="/profile/"]');
      if (profileLink) {
        const href = profileLink.getAttribute('href') || profileLink.href || '';
        const match = href.match(/\/profile\/([^/?#]+)/i);
        if (match?.[1]) return match[1];
      }

      const profileFromPath =
        window.location.pathname.match(/\/profile\/([^/?#]+)/i)?.[1] || null;
      if (profileFromPath) return profileFromPath;

      const scriptTexts = safeQueryAll('script:not([src])')
        .map((script) => script.textContent || '')
        .filter((text) => /"username"\s*:/i.test(text));

      for (const text of scriptTexts) {
        const match = text.match(/"username"\s*:\s*"([^"\\]+)"/i);
        if (match?.[1]) {
          return match[1];
        }
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

    extractProblemFromDom(context) {
      const challengeLink = safeQuery('a[href*="/challenges/"]');
      const challengeHref =
        challengeLink?.getAttribute('href') || challengeLink?.href || '';

      const slugFromLink = challengeHref.match(/\/challenges\/([^/?#]+)/i)?.[1];
      const problemId = firstNonEmpty(context.challengeSlug, slugFromLink);

      let problemName = firstNonEmpty(
        extractText('[data-analytics*="challenge-name"]'),
        extractText('[data-automation*="challenge-name"]'),
        extractText('.challenge-name'),
        extractText('h1'),
        extractText('h2'),
        challengeLink ? extractText(challengeLink) : null,
        problemId
      );

      if (problemName && /submission/i.test(problemName) && problemId) {
        problemName = problemId;
      }

      const problemUrl =
        this.buildChallengeUrl(problemId, context.contestSlug) ||
        (challengeHref
          ? new URL(challengeHref, window.location.href).toString()
          : null);

      return {
        problemId,
        problemName,
        problemUrl,
      };
    }

    extractVerdictFromDom(rows) {
      const verdictSelectors = [
        '[data-analytics*="submission-status"]',
        '[data-automation*="submission-status"]',
        '.submission-result',
        '[class*="submission"] [class*="status"]',
        '[class*="result"] [class*="status"]',
        '[class*="verdict"]',
      ];

      for (const selector of verdictSelectors) {
        const node = safeQuery(selector);
        const value = extractText(node);
        if (!value) continue;
        if (
          /(accepted|wrong answer|time limit|memory limit|runtime error|compile|pending|passed|failed|partial)/i.test(
            value
          )
        ) {
          return value;
        }
      }

      const rowValue = this.findValueByKey(rows, [
        /status/,
        /result/,
        /verdict/,
      ]);
      if (rowValue) return rowValue;

      const bodyText = String(document.body?.innerText || '').slice(0, 12000);
      const verdictMatch = bodyText.match(
        /\b(accepted|wrong answer|time limit exceeded|memory limit exceeded|runtime error|compilation error|pending|partial(?:ly accepted)?|failed)\b/i
      );
      return verdictMatch?.[1] || null;
    }

    extractLanguageFromDom(rows) {
      const languageSelectors = [
        '[data-analytics*="submission-language"]',
        '[data-automation*="submission-language"]',
        '[class*="language"]',
      ];

      for (const selector of languageSelectors) {
        const node = safeQuery(selector);
        const value = extractText(node);
        if (!value) continue;
        if (/^[A-Za-z0-9#+_. -]{2,40}$/.test(value)) {
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

      const runtimeNode = safeQuery('[class*="runtime"], [data-automation*="runtime"]');
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
        .map((line) => line.replace(/\u00a0/g, ' '));
      if (monacoLines.length > 0) {
        pushCandidate(monacoLines.join('\n'), 'monaco', 350);
      }

      const aceLines = safeQueryAll('.ace_line')
        .map((line) => line.innerText || line.textContent || '')
        .map((line) => line.replace(/\u00a0/g, ' '));
      if (aceLines.length > 0) {
        pushCandidate(aceLines.join('\n'), 'ace', 300);
      }

      const codeMirrorLines = safeQueryAll('.CodeMirror-code pre')
        .map((line) => line.textContent || '');
      if (codeMirrorLines.length > 0) {
        pushCandidate(codeMirrorLines.join('\n'), 'codemirror', 300);
      }

      const selectors = [
        '[data-automation*="code"] pre',
        '[data-automation*="code"] code',
        '[class*="code-editor"] pre',
        '[class*="code-editor"] code',
        'pre code',
        'pre',
        'textarea',
      ];

      selectors.forEach((selector) => {
        safeQueryAll(selector).forEach((node) => {
          const value =
            typeof node.value === 'string' ? node.value : node.textContent;
          let bonus = 0;
          if (/code/i.test(selector)) bonus += 180;
          if (/textarea/i.test(selector)) bonus += 120;
          pushCandidate(value, selector, bonus);
        });
      });

      if (candidates.length === 0) return null;

      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].code;
    }

    parseInlineJsonPayload(text) {
      const trimmed = String(text || '').trim();
      if (!trimmed) return null;

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return JSON.parse(trimmed);
        } catch {
          return null;
        }
      }

      const assignmentMatch = trimmed.match(/=\s*({[\s\S]*})\s*;?\s*$/);
      if (assignmentMatch?.[1]) {
        try {
          return JSON.parse(assignmentMatch[1]);
        } catch {
          return null;
        }
      }

      return null;
    }

    findBestCodeInObject(root) {
      if (!root || typeof root !== 'object') return null;

      const stack = [{ node: root, depth: 0, keyHint: '' }];
      const seen = new Set();
      let visited = 0;
      let best = null;

      while (stack.length > 0 && visited < 7000) {
        const { node, depth, keyHint } = stack.pop();
        visited += 1;

        if (depth > 8 || node === null || node === undefined) continue;

        if (typeof node === 'string') {
          const cleaned = cleanSourceCode(node);
          if (!cleaned) continue;

          let score = cleaned.length;
          if (/code|source|program|solution/i.test(keyHint)) score += 600;
          if (looksLikeCode(cleaned)) score += 1000;

          if (!best || score > best.score) {
            best = { score, code: cleaned };
          }
          continue;
        }

        if (typeof node !== 'object') continue;
        if (seen.has(node)) continue;
        seen.add(node);

        if (Array.isArray(node)) {
          const maxItems = Math.min(node.length, 1200);
          for (let i = maxItems - 1; i >= 0; i--) {
            stack.push({ node: node[i], depth: depth + 1, keyHint });
          }
        } else {
          const entries = Object.entries(node);
          for (let i = entries.length - 1; i >= 0; i--) {
            const [key, value] = entries[i];
            stack.push({ node: value, depth: depth + 1, keyHint: key });
          }
        }
      }

      return best?.code || null;
    }

    extractSourceCodeFromEmbeddedJson() {
      const scripts = safeQueryAll('script:not([src])');

      for (const script of scripts) {
        const text = script.textContent || '';
        if (!text || text.length > 2_000_000) continue;
        if (!/code|source|submission/i.test(text)) continue;

        const payload = this.parseInlineJsonPayload(text);
        if (!payload || typeof payload !== 'object') continue;

        const code = this.findBestCodeInObject(payload);
        if (code) return code;
      }

      const preText = extractText('pre');
      if (preText && (preText.startsWith('{') || preText.startsWith('['))) {
        const payload = this.parseInlineJsonPayload(preText);
        if (payload && typeof payload === 'object') {
          const code = this.findBestCodeInObject(payload);
          if (code) return code;
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

    collectCandidateObjects(payload) {
      if (!payload || typeof payload !== 'object') return [];

      const queue = [{ node: payload, depth: 0 }];
      const seen = new Set();
      const objects = [];

      while (queue.length > 0 && objects.length < 700) {
        const { node, depth } = queue.shift();
        if (!node || typeof node !== 'object') continue;
        if (seen.has(node)) continue;
        seen.add(node);
        objects.push(node);

        if (depth >= 7) continue;

        if (Array.isArray(node)) {
          const maxItems = Math.min(node.length, 300);
          for (let i = 0; i < maxItems; i++) {
            queue.push({ node: node[i], depth: depth + 1 });
          }
        } else {
          Object.values(node).forEach((value) => {
            if (value && typeof value === 'object') {
              queue.push({ node: value, depth: depth + 1 });
            }
          });
        }
      }

      return objects;
    }

    normalizeSubmissionPayload(payload, context) {
      const objects = this.collectCandidateObjects(payload);
      if (objects.length === 0) return null;

      let best = null;
      const expectedSubmissionId = String(context.submissionId || '').trim();

      for (const item of objects) {
        const idValue = toStringValue(
          firstDefinedByPaths(item, ['id', 'submission_id', 'submissionId'])
        );
        const codeValue = toStringValue(
          firstDefinedByPaths(item, [
            'code',
            'sourceCode',
            'source_code',
            'submission_code',
            'program',
          ])
        );
        const verdictValue = toStringValue(
          firstDefinedByPaths(item, [
            'status',
            'verdict',
            'result',
            'status_message',
            'submission_status',
          ])
        );
        const languageValue = toStringValue(
          firstDefinedByPaths(item, [
            'language',
            'language_name',
            'lang',
            'compiler',
          ])
        );
        const slugValue = toStringValue(
          firstDefinedByPaths(item, [
            'challenge_slug',
            'challenge.slug',
            'challenge.name_slug',
            'slug',
          ])
        );

        let score = 0;
        if (idValue) score += 1;
        if (expectedSubmissionId && idValue === expectedSubmissionId) score += 8;
        if (codeValue && codeValue.length > 8) score += 6;
        if (verdictValue) score += 3;
        if (languageValue) score += 2;
        if (slugValue) score += 2;

        if (!best || score > best.score) {
          best = { score, item };
        }
      }

      if (!best || best.score < 3) {
        return null;
      }

      const chosen = best.item;

      const submissionId = firstNonEmpty(
        toStringValue(firstDefinedByPaths(chosen, ['id', 'submission_id', 'submissionId'])),
        expectedSubmissionId,
        context.submissionId
      );

      const challengeSlug = firstNonEmpty(
        toStringValue(
          firstDefinedByPaths(chosen, [
            'challenge_slug',
            'challenge.slug',
            'challenge.name_slug',
            'slug',
          ])
        ),
        context.challengeSlug
      );

      const contestSlug = firstNonEmpty(
        toStringValue(
          firstDefinedByPaths(chosen, ['contest_slug', 'contest.slug', 'contest'])
        ),
        context.contestSlug
      );

      const problemName = firstNonEmpty(
        toStringValue(
          firstDefinedByPaths(chosen, [
            'challenge_name',
            'challenge.name',
            'name',
            'title',
            'challenge.title',
          ])
        ),
        challengeSlug
      );

      const verdictRaw = firstNonEmpty(
        toStringValue(
          firstDefinedByPaths(chosen, [
            'status',
            'verdict',
            'result',
            'status_message',
            'submission_status',
          ])
        )
      );

      const language = firstNonEmpty(
        toStringValue(
          firstDefinedByPaths(chosen, [
            'language',
            'language_name',
            'lang',
            'compiler',
          ])
        )
      );

      const executionTime =
        parseDurationToMs(
          firstDefinedByPaths(chosen, [
            'runtime',
            'run_time',
            'time_taken',
            'execution_time',
            'execution_time_ms',
          ])
        ) ||
        (() => {
          const raw = firstDefinedByPaths(chosen, ['execution_time_ms']);
          const numeric = Number.parseInt(raw, 10);
          return Number.isFinite(numeric) ? numeric : null;
        })();

      const memoryUsed = parseMemoryToKb(
        firstDefinedByPaths(chosen, [
          'memory',
          'memory_used',
          'memory_kb',
          'memory_usage',
        ])
      );

      const submittedAt = parseTimestampToIso(
        firstDefinedByPaths(chosen, [
          'created_at',
          'submitted_at',
          'submission_time',
          'timestamp',
          'time',
        ])
      );

      const sourceCode = cleanSourceCode(
        toStringValue(
          firstDefinedByPaths(chosen, [
            'code',
            'sourceCode',
            'source_code',
            'submission_code',
            'program',
          ])
        )
      );

      const handle = firstNonEmpty(
        toStringValue(
          firstDefinedByPaths(chosen, [
            'hacker',
            'username',
            'user.username',
            'owner',
            'author',
          ])
        )
      );

      const problemUrl = this.buildChallengeUrl(challengeSlug, contestSlug);

      return {
        submissionId,
        challengeSlug,
        contestSlug,
        problemName,
        problemUrl,
        verdictRaw,
        language,
        executionTime,
        memoryUsed,
        submittedAt,
        sourceCode,
        handle,
      };
    }

    async fetchSubmissionDataFromApi(context) {
      if (typeof fetch !== 'function') return null;
      if (!context.submissionId) return null;

      const candidates = this.buildSubmissionApiCandidates(context);
      for (const candidateUrl of candidates) {
        try {
          const response = await fetch(candidateUrl, {
            credentials: 'include',
            headers: {
              Accept: 'application/json, text/plain, */*',
            },
          });

          if (!response.ok) {
            continue;
          }

          const text = await response.text();
          if (!text) continue;

          const payload = this.parseInlineJsonPayload(text);
          if (!payload || typeof payload !== 'object') continue;

          const normalized = this.normalizeSubmissionPayload(payload, context);
          if (normalized) {
            return normalized;
          }
        } catch {
          continue;
        }
      }

      return null;
    }

    async extractSubmission(request = {}) {
      const context = this.parseUrlContext();
      const requestSubmissionId = normalizeWhitespace(request?.submissionId);

      if (requestSubmissionId && !context.submissionId) {
        context.submissionId = requestSubmissionId;
      }

      if (!context.submissionId) {
        logWarn('No submission ID found in URL');
        return null;
      }

      await waitForElement('body', 5000).catch(() => null);

      const keyValueRows = this.extractKeyValueRows();
      const problem = this.extractProblemFromDom(context);

      const domVerdict = this.extractVerdictFromDom(keyValueRows);
      const domLanguage = this.extractLanguageFromDom(keyValueRows);
      const domExecutionTime = this.extractExecutionTimeFromDom(keyValueRows);
      const domMemory = this.extractMemoryFromDom(keyValueRows);
      const domSubmittedAt = this.extractSubmittedAtFromDom(keyValueRows);
      const domSourceCode = this.extractSourceCodeFromDom();
      const embeddedSourceCode = this.extractSourceCodeFromEmbeddedJson();

      const apiData = await this.fetchSubmissionDataFromApi(context);

      const sourceCode = this.pickBestSourceCode([
        apiData?.sourceCode,
        domSourceCode,
        embeddedSourceCode,
      ]);

      const handle = firstNonEmpty(apiData?.handle, await this.getUserHandle());
      const problemId = firstNonEmpty(apiData?.challengeSlug, problem.problemId);
      const problemName = firstNonEmpty(
        apiData?.problemName,
        problem.problemName,
        problemId
      );
      const problemUrl = firstNonEmpty(
        apiData?.problemUrl,
        this.buildChallengeUrl(problemId, apiData?.contestSlug || context.contestSlug),
        problem.problemUrl
      );

      const verdictRaw = firstNonEmpty(apiData?.verdictRaw, domVerdict);
      const verdict = normalizeVerdict(verdictRaw || 'UNKNOWN');

      const language = firstNonEmpty(apiData?.language, domLanguage, 'Unknown');
      const executionTime =
        apiData?.executionTime !== null && apiData?.executionTime !== undefined
          ? apiData.executionTime
          : domExecutionTime;
      const memoryUsed =
        apiData?.memoryUsed !== null && apiData?.memoryUsed !== undefined
          ? apiData.memoryUsed
          : domMemory;

      const submittedAt =
        parseTimestampToIso(apiData?.submittedAt) || parseTimestampToIso(domSubmittedAt);

      const submission = {
        platform: this.platform,
        handle,
        problemId,
        problemName,
        problemUrl,
        submissionId: context.submissionId,
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
        submission_id: context.submissionId,
        submission_url: window.location.href,
        verdict_raw: verdictRaw || null,
        submitted_at: submittedAt || null,
        source_code: sourceCode,
        execution_time_ms: executionTime,
        memory_kb: memoryUsed,
      };

      return submission;
    }

    extractProblemDetails() {
      const context = this.parseUrlContext();
      const problem = this.extractProblemFromDom(context);

      const root =
        safeQuery('.challenge-body-html') ||
        safeQuery('.challenge-statement') ||
        safeQuery('.challenge_problem_statement') ||
        safeQuery('[data-analytics*="problem-statement"]') ||
        safeQuery('main') ||
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
        extractText('.challenge-body-html'),
        extractText('.challenge-statement'),
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

    async handleExtractSubmissionMessage(request, sendResponse) {
      try {
        const pageType = this.detectPageType();
        if (pageType !== 'submission') {
          sendResponse({
            success: false,
            nonRetriable: true,
            error: 'Not on HackerRank submission page',
          });
          return;
        }

        const submission = await this.extractSubmission(request);
        if (!submission) {
          sendResponse({
            success: false,
            error: 'Could not extract HackerRank submission details',
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
            error: 'HackerRank source code not ready yet',
          });
          return;
        }

        sendResponse({ success: true, data: submission, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Failed to extract HackerRank submission',
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
            error: 'Not on HackerRank challenge page yet',
          });
          return;
        }

        await waitForElement('body', 4000).catch(() => null);

        const details = this.extractProblemDetails();
        if (!this.hasMeaningfulProblemDetails(details)) {
          sendResponse({
            success: false,
            pending: true,
            error: 'HackerRank problem details not ready yet',
          });
          return;
        }

        sendResponse({ success: true, data: details, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Failed to extract HackerRank problem details',
        });
      }
    }

    setupMessageListener() {
      if (!browserAPI?.runtime?.onMessage || this.messageListenerAttached) {
        return;
      }

      this.messageListenerAttached = true;

      browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        const platformCache = Array.isArray(cached[this.platform])
          ? cached[this.platform]
          : [];

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
      if (!browserAPI?.storage?.sync || !browserAPI?.runtime) return;
      if (!submission?.submissionId) return;

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
      log('Content script ready on', window.location.href, 'pageType=', pageType);

      if (pageType === 'submission') {
        const submission = await this.extractSubmission({});
        if (submission) {
          this.storeSubmission(submission);
        }
      }

      this.initialized = true;
    }
  }

  function initExtractor() {
    const extractor = new HackerRankExtractor();
    extractor.init().catch((error) => {
      logError('Initialization failed:', error?.message || error);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
})();