/**
 * NEUPC VJudge Extractor (Standalone)
 * Self-contained script without ES module imports for browser compatibility.
 * Extracts submission data and source code from VJudge.
 */

(function () {
  'use strict';

  if (window.__NEUPC_VJUDGE_INJECTED__) {
    console.warn('[NEUPC:vjudge] Already injected, skipping');
    return;
  }
  window.__NEUPC_VJUDGE_INJECTED__ = true;

  const PLATFORM = 'vjudge';
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

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function firstNonEmpty(...values) {
    for (const value of values) {
      if (value === undefined || value === null) continue;
      const text = String(value).trim();
      if (!text) continue;
      return text;
    }
    return null;
  }

  function normalizeVerdict(verdict) {
    if (!verdict) return 'UNKNOWN';
    const v = verdict.toUpperCase().trim();

    if (v.includes('ACCEPTED') || v === 'AC' || v === 'OK') return 'AC';
    if (v.includes('WRONG ANSWER') || v === 'WA') return 'WA';
    if (v.includes('TIME LIMIT') || v === 'TLE') return 'TLE';
    if (v.includes('MEMORY LIMIT') || v === 'MLE') return 'MLE';
    if (v.includes('RUNTIME ERROR') || v === 'RE' || v === 'RTE') return 'RE';
    if (
      v.includes('COMPILATION ERROR') ||
      v === 'CE' ||
      v.includes('COMPILE ERROR')
    ) {
      return 'CE';
    }
    if (v.includes('PENDING') || v.includes('QUEUE') || v.includes('RUNNING')) {
      return 'PENDING';
    }

    return verdict;
  }

  function normalizeVJudgeSubmissionId(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const withoutPrefix = raw.replace(/^vj_/i, '');
    return `vj_${withoutPrefix}`;
  }

  function extractRawRunId(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    return raw.replace(/^vj_/i, '');
  }

  function parseDurationToMs(value) {
    if (!value) return null;

    const text = String(value).trim();
    const match = text.match(/([0-9]*\.?[0-9]+)\s*(ms|s|sec|seconds?)/i);
    if (!match) {
      const numberOnly = text.match(/([0-9]+)/);
      return numberOnly ? Number.parseInt(numberOnly[1], 10) : null;
    }

    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) return null;

    const unit = String(match[2]).toLowerCase();
    if (unit.startsWith('ms')) return Math.round(amount);
    return Math.round(amount * 1000);
  }

  function parseMemoryToKb(value) {
    if (!value) return null;

    const text = String(value).trim();
    const match = text.match(/([0-9]*\.?[0-9]+)\s*(kb|mb|gb|kib|mib|gib|b)/i);
    if (!match) {
      const numberOnly = text.match(/([0-9]+)/);
      return numberOnly ? Number.parseInt(numberOnly[1], 10) : null;
    }

    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) return null;

    const unit = String(match[2]).toLowerCase();
    if (unit === 'gb' || unit === 'gib')
      return Math.round(amount * 1024 * 1024);
    if (unit === 'mb' || unit === 'mib') return Math.round(amount * 1024);
    if (unit === 'b') return Math.round(amount / 1024);
    return Math.round(amount);
  }

  function normalizeProblemDetailText(value) {
    if (typeof value !== 'string') return '';

    const noisyLinePatterns = [
      /^home$/i,
      /^problem$/i,
      /^status$/i,
      /^contest$/i,
      /^workbook$/i,
      /^user$/i,
      /^group$/i,
      /^forum$/i,
      /^help$/i,
      /^login$/i,
      /^register$/i,
      /^discover more$/i,
      /^leave a comment$/i,
      /^all copyright reserved/i,
      /^server time:/i,
      /^translation$/i,
      /^copy plain text$/i,
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

  function htmlFragmentToPlainText(value) {
    if (typeof value !== 'string') {
      return '';
    }

    const container = document.createElement('div');
    container.innerHTML = value;

    return normalizeProblemDetailText(
      String(container.textContent || container.innerText || '')
    );
  }

  function parseEmbeddedProblemData() {
    const node = safeQuery('textarea[name="dataJson"]');
    if (!node) {
      return null;
    }

    const raw = firstNonEmpty(node.value, node.textContent);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getEmbeddedProblemProperty(problemData, key) {
    if (!problemData || !Array.isArray(problemData.properties)) {
      return null;
    }

    const normalizedKey = String(key || '')
      .trim()
      .toLowerCase();
    if (!normalizedKey) {
      return null;
    }

    const hit = problemData.properties.find(
      (entry) =>
        String(entry?.title || '')
          .trim()
          .toLowerCase() === normalizedKey
    );

    if (!hit) {
      return null;
    }

    return htmlFragmentToPlainText(String(hit.content || ''));
  }

  function parseTagsFromValue(value) {
    if (typeof value !== 'string') {
      return [];
    }

    const tags = value
      .split(/[\n,;|]/)
      .flatMap((chunk) => chunk.split(/\s{2,}|\t+/))
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 16);

    if (tags.length > 1) {
      return tags;
    }

    return value
      .split(/\s+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 16);
  }

  function isLikelyProblemStatementText(value) {
    const text = normalizeProblemDetailText(String(value || ''));
    if (!text) {
      return false;
    }

    const lower = text.toLowerCase();
    const wordCount = lower.split(/\s+/).filter(Boolean).length;

    const signalPatterns = [
      /input\s+format/i,
      /output\s+format/i,
      /constraints?/i,
      /sample\s+input/i,
      /sample\s+output/i,
      /problem\s+statement/i,
      /\bgiven\b/i,
      /\bfind\b/i,
    ];

    const uiNoisePatterns = [
      /\bsubmit\b/i,
      /\bleaderboard\b/i,
      /\brecrawl\b/i,
      /\btranslation\b/i,
      /discover more/i,
      /leave a comment/i,
      /all copyright reserved/i,
      /server time:/i,
      /\bhome\b/i,
      /\bstatus\b/i,
      /\bcontest\b/i,
      /\bworkbook\b/i,
      /\bforum\b/i,
    ];

    const signalHits = signalPatterns.filter((pattern) =>
      pattern.test(text)
    ).length;
    const noiseHits = uiNoisePatterns.filter((pattern) =>
      pattern.test(text)
    ).length;

    if (signalHits >= 2) {
      return true;
    }

    if (signalHits >= 1 && wordCount >= 25) {
      return true;
    }

    if (wordCount >= 60 && noiseHits <= 2) {
      return true;
    }

    return false;
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
        : '(?:Input(?:\\s+Format)?|Output(?:\\s+Format)?|Constraints?|Sample\\s+Input|Sample\\s+Output|Example|Examples|Explanation|Note|Notes|Hints?)';

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
      /Sample\s+Input\s*:?([\s\S]*?)\n\s*Sample\s+Output\s*:?([\s\S]*?)(?=\n\s*(?:Sample\s+Input|Explanation|Note|Notes|Hints?|Constraints?|$))/gi;

    let match;
    while ((match = regex.exec(normalized)) != null && tests.length < 6) {
      const input = String(match[1] || '').trim();
      const output = String(match[2] || '').trim();
      if (!input && !output) continue;
      tests.push({ input, output });
    }

    return tests;
  }

  function parseProblemDifficulty(text) {
    const match = String(text || '').match(
      /(?:difficulty|problem\.view\.properties\.difficulty)\s*:?\s*(\d{2,5})/i
    );
    if (!match) return null;

    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) ? value : null;
  }

  function parseProblemTags(text) {
    const normalizedText = String(text || '');
    const match = normalizedText.match(
      /(?:^|\n)(?:tags?|problem\.view\.properties\.tags)\s*:?\s*([^\n]+)/i
    );

    if (!match?.[1]) {
      return [];
    }

    const rawValue = String(match[1]).trim();
    if (!rawValue) {
      return [];
    }

    const byComma = rawValue
      .split(/[;,|]/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (byComma.length > 1) {
      return byComma;
    }

    const bySpace = rawValue
      .split(/\s+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12);

    return bySpace.length > 0 ? bySpace : [];
  }

  function normalizeSubmittedAt(value) {
    if (!value) return null;

    const raw = String(value).trim();
    if (!raw) return null;

    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }

    return raw;
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

    const signals = [
      /#include\s*</,
      /\bint\s+main\s*\(/,
      /\bdef\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/,
      /\bclass\s+[A-Za-z_][A-Za-z0-9_]*\b/,
      /\busing\s+namespace\b/,
      /\bpublic\s+static\s+void\s+main\b/,
      /\bcout\s*<</,
      /\bcin\s*>>/,
      /\bscanf\s*\(/,
      /\bprintf\s*\(/,
      /\breturn\s+[0-9]+\s*;/,
      /\{[\s\S]{20,}\}/,
    ];

    if (signals.some((signal) => signal.test(text))) {
      return true;
    }

    const newlineCount = (text.match(/\n/g) || []).length;
    return newlineCount >= 4;
  }

  function extractSourceFromApiPayload(payload) {
    if (!payload || typeof payload !== 'object') return null;

    const containers = [
      payload,
      payload.data,
      payload.solution,
      payload.result,
      payload.payload,
      payload.msg,
    ].filter((container) => container && typeof container === 'object');

    for (const container of containers) {
      const candidate =
        container.code ||
        container.source ||
        container.sourceCode ||
        container.solutionCode ||
        null;

      if (typeof candidate === 'string') {
        const cleaned = cleanSourceCode(candidate);
        if (cleaned && looksLikeCode(cleaned)) {
          return cleaned;
        }
      }
    }

    return null;
  }

  class VJudgeExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
      this.extractionComplete = false;
      this.extractionResult = null;
      this.clickedCodeRevealTargets = new WeakSet();
      this.frameAccessWarningLogged = false;
    }

    detectPageType() {
      const path = window.location.pathname;

      if (path.includes('/solution/')) {
        return 'submission';
      }
      if (path.includes('/status')) {
        return 'submissions';
      }
      if (path.includes('/problem/')) {
        return 'problem';
      }

      return 'unknown';
    }

    extractSubmissionIdFromUrl() {
      const match = window.location.pathname.match(/\/solution\/(\d+)/);
      return match?.[1] || null;
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href^="/user/"]');
      if (userLink) {
        const href = userLink.getAttribute('href');
        const match = String(href || '').match(/\/user\/([^/]+)/);
        if (match?.[1]) return match[1];
      }

      return null;
    }

    getDescriptionListItems() {
      return safeQueryAll('#prob-descs li[data-key], #prob-descs li');
    }

    getDescriptionFrameElement() {
      return (
        safeQuery('iframe#frame-description') ||
        safeQuery('#frame-description') ||
        safeQuery('iframe[name="frame-description"]') ||
        null
      );
    }

    readDescriptionFrameText(frameElement) {
      if (!frameElement) {
        return '';
      }

      try {
        const doc =
          frameElement.contentDocument || frameElement.contentWindow?.document;
        if (doc?.body) {
          return normalizeProblemDetailText(
            String(doc.body.innerText || doc.body.textContent || '')
          );
        }
      } catch (error) {
        if (!this.frameAccessWarningLogged) {
          this.frameAccessWarningLogged = true;
          logWarn(
            'Unable to access VJudge description iframe content:',
            error?.message || String(error)
          );
        }
      }

      return '';
    }

    async ensureDescriptionFrameReady(timeoutMs = 3500) {
      const tabs = this.getDescriptionListItems();
      const activeTab = tabs.find(
        (tab) =>
          tab.classList.contains('active') ||
          tab.getAttribute('aria-selected') === 'true'
      );
      const orderedTabs = [
        ...(activeTab ? [activeTab] : []),
        ...tabs.filter((tab) => tab !== activeTab),
      ];
      const tabTargets = orderedTabs.length > 0 ? orderedTabs : [null];
      const perTabBudget = Math.max(
        450,
        Math.floor(timeoutMs / tabTargets.length)
      );

      for (const tab of tabTargets) {
        if (tab && typeof tab.click === 'function') {
          try {
            tab.click();
          } catch {
            // Ignore click errors and continue polling.
          }
        }

        const deadline = Date.now() + perTabBudget;
        while (Date.now() < deadline) {
          const frameElement = this.getDescriptionFrameElement();
          const frameText = this.readDescriptionFrameText(frameElement);
          if (frameText.length >= 120) {
            return { frameElement, frameText };
          }
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
      }

      const frameElement = this.getDescriptionFrameElement();
      return {
        frameElement,
        frameText: this.readDescriptionFrameText(frameElement),
      };
    }

    isCodeLoginRequired() {
      const bodyText = String(document.body?.innerText || '');
      return /please\s+login\s+to\s+browse\s+this\s+code/i.test(bodyText);
    }

    extractInfoTable() {
      const info = {
        status: null,
        time: null,
        memory: null,
        language: null,
        submitted: null,
      };

      const rows = safeQueryAll('table tr');
      for (const row of rows) {
        const labelRaw = extractText('th', row);
        const valueCell = safeQuery('td', row);
        const valueRaw = valueCell ? extractText(valueCell) : '';

        const label = labelRaw.toLowerCase();
        if (!label || !valueRaw) continue;

        if (label.includes('status')) {
          info.status = valueRaw;
        } else if (label === 'time' || label.includes('time')) {
          info.time = valueRaw;
        } else if (label === 'mem' || label.includes('memory')) {
          info.memory = valueRaw;
        } else if (label.startsWith('lang') || label.includes('language')) {
          info.language = valueRaw;
        } else if (label.includes('submitted')) {
          info.submitted = valueRaw;
        }
      }

      return info;
    }

    extractProblemInfo() {
      let problemId = null;
      let problemName = null;
      let problemUrl = null;

      const problemLink = safeQuery('a[href*="/problem/"]');
      if (problemLink) {
        problemUrl =
          problemLink.href || problemLink.getAttribute('href') || null;
        problemName = extractText(problemLink) || null;

        const match = String(problemUrl || '').match(/\/problem\/([^/?#]+)/i);
        if (match?.[1]) {
          problemId = decodeURIComponent(match[1]);
        }
      }

      const heading = extractText('h4, h3, .panel-title, .page-header h4');
      if (!problemId && heading) {
        const bracketIds = [...heading.matchAll(/\[\[([^\]]+)\]\]/g)].map(
          (item) => item[1]
        );
        if (bracketIds.length > 0) {
          problemId = bracketIds[0];
        }
        if (!problemName && bracketIds.length > 1) {
          problemName = bracketIds[1];
        }
      }

      if (!problemName && problemId) {
        problemName = problemId;
      }

      return {
        problemId,
        problemName,
        problemUrl,
      };
    }

    async fetchSourceCodeFromApi(submissionNumericId) {
      if (!submissionNumericId) {
        return { sourceCode: null, loginRequired: false, nonRetriable: true };
      }

      const endpoints = [
        `/solution/data/${encodeURIComponent(submissionNumericId)}`,
        `/solution/data/${encodeURIComponent(submissionNumericId)}?_=${Date.now()}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              Accept: 'application/json,text/plain,*/*',
              'X-Requested-With': 'XMLHttpRequest',
            },
          });

          if (response.status === 401 || response.status === 403) {
            return {
              sourceCode: null,
              loginRequired: true,
              nonRetriable: true,
              error: `HTTP ${response.status}`,
            };
          }

          if (!response.ok) {
            continue;
          }

          const rawText = await response.text();
          if (!rawText) {
            continue;
          }

          if (/please\s+login\s+to\s+browse\s+this\s+code/i.test(rawText)) {
            return {
              sourceCode: null,
              loginRequired: true,
              nonRetriable: true,
              error: 'Login required',
            };
          }

          if (/could you please stopping crawling/i.test(rawText)) {
            return {
              sourceCode: null,
              loginRequired: false,
              nonRetriable: true,
              error: 'VJudge anti-crawl response',
            };
          }

          let payload = null;
          try {
            payload = JSON.parse(rawText);
          } catch {
            payload = null;
          }

          const fromPayload = extractSourceFromApiPayload(payload);
          if (fromPayload) {
            return {
              sourceCode: fromPayload,
              loginRequired: false,
              nonRetriable: false,
            };
          }

          if (!/^\s*</.test(rawText) && looksLikeCode(rawText)) {
            const cleaned = cleanSourceCode(rawText);
            if (cleaned) {
              return {
                sourceCode: cleaned,
                loginRequired: false,
                nonRetriable: false,
              };
            }
          }
        } catch (error) {
          logWarn(
            'VJudge API source fetch error:',
            error?.message || String(error)
          );
        }
      }

      return {
        sourceCode: null,
        loginRequired: false,
        nonRetriable: false,
      };
    }

    getCodeRevealTargets() {
      const targets = safeQueryAll('button, a, [role="button"]');
      return targets.filter((target) => {
        const text = String(
          target.innerText || target.textContent || ''
        ).trim();
        if (!text) return false;
        return /(show\s*code|view\s*code|source\s*code|expand)/i.test(text);
      });
    }

    async ensureCodeVisible() {
      const targets = this.getCodeRevealTargets();
      if (targets.length === 0) {
        return false;
      }

      let clicked = 0;
      for (const target of targets) {
        if (this.clickedCodeRevealTargets.has(target)) {
          continue;
        }

        this.clickedCodeRevealTargets.add(target);
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        clicked++;
        await sleep(120);
      }

      if (clicked > 0) {
        await sleep(350);
      }

      return clicked > 0;
    }

    extractSourceCodeFromDom() {
      if (this.isCodeLoginRequired()) {
        return {
          sourceCode: null,
          loginRequired: true,
        };
      }

      const lineSelectors = [
        '.ace_line',
        '.ace_text-layer .ace_line',
        '.CodeMirror-line',
        '.CodeMirror-code > div',
        '.monaco-editor .view-line',
      ];

      for (const selector of lineSelectors) {
        const lineNodes = safeQueryAll(selector);
        if (lineNodes.length === 0) continue;

        const lines = lineNodes.map((line) => String(line.textContent || ''));
        const joined = cleanSourceCode(lines.join('\n'));
        if (joined && looksLikeCode(joined)) {
          return {
            sourceCode: joined,
            loginRequired: false,
          };
        }
      }

      const blockSelectors = [
        '#solution-source pre',
        '#solution-source code',
        '.solution-source pre',
        '.solution-source code',
        '.code-content pre',
        '.code-content code',
        'pre code',
        'pre',
        'textarea',
      ];

      for (const selector of blockSelectors) {
        const nodes = safeQueryAll(selector);
        for (const node of nodes) {
          const textValue = firstNonEmpty(node.innerText, node.textContent);
          const cleaned = cleanSourceCode(textValue || '');
          if (cleaned && looksLikeCode(cleaned)) {
            return {
              sourceCode: cleaned,
              loginRequired: false,
            };
          }
        }
      }

      return {
        sourceCode: null,
        loginRequired: false,
      };
    }

    async extractSourceCode(submissionNumericId) {
      const apiResult = await this.fetchSourceCodeFromApi(submissionNumericId);
      if (
        apiResult.sourceCode ||
        apiResult.loginRequired ||
        apiResult.nonRetriable
      ) {
        return apiResult;
      }

      const maxAttempts = 8;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (attempt === 0 || attempt === 2 || attempt === 4) {
          await this.ensureCodeVisible();
        }

        const domResult = this.extractSourceCodeFromDom();
        if (domResult.sourceCode || domResult.loginRequired) {
          return {
            ...domResult,
            nonRetriable: domResult.loginRequired,
          };
        }

        await sleep(350);
      }

      return {
        sourceCode: null,
        loginRequired: false,
        nonRetriable: false,
      };
    }

    async extractSubmission() {
      try {
        const numericSubmissionId = this.extractSubmissionIdFromUrl();
        if (!numericSubmissionId) {
          log('No submission ID in URL');
          return null;
        }

        const submissionId = normalizeVJudgeSubmissionId(numericSubmissionId);

        await waitForElement('table, h4, .panel-title', 5000).catch(() => null);

        const infoTable = this.extractInfoTable();
        const problemInfo = this.extractProblemInfo();
        const sourceResult = await this.extractSourceCode(numericSubmissionId);

        const sourceCode = sourceResult.sourceCode || null;
        const verdict = normalizeVerdict(
          firstNonEmpty(
            infoTable.status,
            extractText('[class*="status"], .verdict')
          )
        );
        const language =
          firstNonEmpty(
            infoTable.language,
            extractText('[class*="language"], .lang')
          ) || 'Unknown';
        const executionTime = parseDurationToMs(
          firstNonEmpty(infoTable.time, extractText('[class*="time"]'))
        );
        const memoryUsed = parseMemoryToKb(
          firstNonEmpty(
            infoTable.memory,
            extractText('[class*="mem"], [class*="memory"]')
          )
        );
        const submittedAt = normalizeSubmittedAt(infoTable.submitted);

        const originPlatform = problemInfo.problemId
          ? String(problemInfo.problemId).split('-')[0] || null
          : null;

        const handle = await this.getUserHandle();

        const submission = {
          platform: this.platform,
          handle,
          problemId: problemInfo.problemId,
          problemName: problemInfo.problemName || problemInfo.problemId,
          problemUrl: problemInfo.problemUrl,
          submissionId,
          submissionUrl: `https://vjudge.net/solution/${extractRawRunId(submissionId)}`,
          verdict,
          language,
          executionTime,
          memoryUsed,
          submittedAt,
          sourceCode,
          originPlatform,
          _loginRequired: Boolean(sourceResult.loginRequired),
          _nonRetriable: Boolean(sourceResult.nonRetriable),
        };

        log('Extracted submission:', {
          submissionId: submission.submissionId,
          problemId: submission.problemId,
          verdict: submission.verdict,
          language: submission.language,
          sourceLength: submission.sourceCode?.length || 0,
          loginRequired: submission._loginRequired,
        });

        return submission;
      } catch (error) {
        logError('Error extracting submission:', error);
        return null;
      }
    }

    async extractProblemDetails() {
      if (this.detectPageType() !== 'problem') {
        return null;
      }

      try {
        await waitForElement('body', 4500).catch(() => null);

        const embeddedProblemData = parseEmbeddedProblemData();
        const embeddedTimeLimitText = getEmbeddedProblemProperty(
          embeddedProblemData,
          'time_limit'
        );
        const embeddedMemoryLimitText = getEmbeddedProblemProperty(
          embeddedProblemData,
          'mem_limit'
        );
        const embeddedDifficultyText = getEmbeddedProblemProperty(
          embeddedProblemData,
          'difficulty'
        );
        const embeddedTagsText = getEmbeddedProblemProperty(
          embeddedProblemData,
          'tags'
        );

        const pathProblemId =
          window.location.pathname.match(/\/problem\/([^/?#]+)/)?.[1] || null;
        const embeddedProblemId =
          embeddedProblemData?.oj && embeddedProblemData?.prob
            ? `${embeddedProblemData.oj}-${embeddedProblemData.prob}`
            : null;
        const problemId = pathProblemId || embeddedProblemId;
        const headingName =
          extractText('#prob-title h2, h1, h2, h3, .panel-title, .title') ||
          null;
        const titleName = String(document.title || '')
          .replace(/\s*\|\s*VJudge\s*$/i, '')
          .replace(/\s*-\s*Virtual\s*Judge\s*$/i, '')
          .trim();
        const problemName = headingName || titleName || problemId;

        const rightPanelNode = safeQuery('#prob-right-panel');
        const frameReady = await this.ensureDescriptionFrameReady(3500);
        const frameText = normalizeProblemDetailText(
          String(frameReady?.frameText || '')
        );

        const statementSelectors = [
          '#prob-right-panel #problem-statement',
          '#prob-right-panel #prob-content',
          '#prob-right-panel .problem-statement',
          '#prob-right-panel .problem-content',
          '#prob-right-panel [id*="desc"]',
          '#prob-right-panel [id*="statement"]',
          '#prob-right-panel [class*="statement"]',
          '#prob-right-panel .markdown-body',
          '#prob-right-panel article',
          '#prob-right-panel main',
          '#prob-right-panel .panel-body',
        ];

        const fullPageText = normalizeProblemDetailText(
          String(rightPanelNode?.innerText || document.body?.innerText || '')
        );
        const analysisText = normalizeProblemDetailText(
          [fullPageText, frameText]
            .filter((text) => text && text.length > 0)
            .join('\n\n')
        );

        const statementCandidates = [];
        statementSelectors.forEach((selector) => {
          safeQueryAll(selector).forEach((node) => {
            if (node.closest('#problem_discuss')) {
              return;
            }

            const text = normalizeProblemDetailText(
              String(node?.innerText || node?.textContent || '')
            );
            if (text.length < 120) {
              return;
            }

            const markerCount = [
              /input\s+format/i,
              /output\s+format/i,
              /constraints?/i,
              /sample\s+input/i,
              /sample\s+output/i,
              /problem\s+statement/i,
            ].filter((pattern) => pattern.test(text)).length;

            const noiseCount = [
              /leave a comment/i,
              /discover more/i,
              /all copyright reserved/i,
              /server time:/i,
            ].filter((pattern) => pattern.test(text)).length;

            let score = Math.min(text.length, 9000) + markerCount * 500;

            if (isLikelyProblemStatementText(text)) {
              score += 500;
            } else {
              score -= 700;
            }

            if (
              node.matches(
                '#problem-statement, .problem-statement, [id*="desc"], [id*="statement"]'
              )
            ) {
              score += 600;
            }

            score -= noiseCount * 450;

            statementCandidates.push({ selector, text, score });
          });
        });

        if (frameText.length >= 120) {
          let frameScore = Math.min(frameText.length, 12000) + 2500;
          if (isLikelyProblemStatementText(frameText)) {
            frameScore += 1800;
          } else {
            frameScore -= 1200;
          }

          statementCandidates.push({
            selector: '#frame-description',
            text: frameText,
            score: frameScore,
          });
        }

        if (
          fullPageText.length >= 120 &&
          isLikelyProblemStatementText(fullPageText)
        ) {
          statementCandidates.push({
            selector: 'body',
            text: fullPageText,
            score: Math.min(fullPageText.length, 5000),
          });
        }

        statementCandidates.sort((a, b) => b.score - a.score);
        const statementText = statementCandidates[0]?.text || fullPageText;

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
          'Hint',
          'Hints',
          'Note',
          'Notes',
        ];

        let description =
          extractLabeledSection(
            statementText,
            ['Problem Statement', 'Statement', 'Description'],
            sectionStops
          ) || null;

        if (!description && statementText) {
          const prefaceMatch = statementText.match(
            /^[\s\S]*?(?=\n\s*(?:Input(?:\s+Format)?|Output(?:\s+Format)?|Constraints?|Sample\s+Input|Sample\s+Output|Examples?|Explanation|Hints?|Note|Notes)\s*:|$)/i
          );
          const preface = normalizeProblemDetailText(prefaceMatch?.[0] || '');
          if (isLikelyProblemStatementText(preface)) {
            description = preface;
          }
        }

        if (description && !isLikelyProblemStatementText(description)) {
          description = null;
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
          ['Note', 'Notes', 'Hint', 'Hints', 'Explanation'],
          sectionStops
        );
        const examples = parseSampleTests(statementText);

        const timeLimitMatch = analysisText.match(
          /(?:time\s*limit|problem\.view\.properties\.time_limit)\s*:?\s*([0-9]*\.?[0-9]+\s*(?:ms|s|sec|seconds?))/i
        );
        const memoryLimitMatch = analysisText.match(
          /(?:mem(?:ory)?\s*limit|problem\.view\.properties\.mem_limit)\s*:?\s*([0-9]*\.?[0-9]+\s*(?:kb|mb|gb|kib|mib|gib|b))/i
        );

        const timeLimitMs =
          parseDurationToMs(embeddedTimeLimitText) ||
          (timeLimitMatch ? parseDurationToMs(timeLimitMatch[1]) : null);
        const memoryLimitKb =
          parseMemoryToKb(embeddedMemoryLimitText) ||
          (memoryLimitMatch ? parseMemoryToKb(memoryLimitMatch[1]) : null);

        const embeddedDifficulty = Number.parseInt(
          String(embeddedDifficultyText || '').trim(),
          10
        );
        const difficultyRating = Number.isFinite(embeddedDifficulty)
          ? embeddedDifficulty
          : parseProblemDifficulty(analysisText);
        const tags =
          parseTagsFromValue(embeddedTagsText).length > 0
            ? parseTagsFromValue(embeddedTagsText)
            : parseProblemTags(analysisText);

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
          tutorialContent: null,
          tutorialSolutions: [],
          timeLimitMs,
          time_limit_ms: timeLimitMs,
          memoryLimitKb,
          memory_limit_kb: memoryLimitKb,
          difficultyRating,
          difficulty_rating: difficultyRating,
          tags,
        };
      } catch (error) {
        logError('Error extracting problem details:', error);
        return null;
      }
    }

    isProblemPageReady() {
      const statementNode = safeQuery(
        '#prob-right-panel #problem-statement, #prob-right-panel .problem-statement, #prob-right-panel #prob-content, #prob-right-panel [id*="desc"], #prob-right-panel [id*="statement"], #prob-right-panel [class*="statement"], #prob-right-panel article'
      );
      const rightPanelText = normalizeProblemDetailText(
        String(safeQuery('#prob-right-panel')?.innerText || '')
      );
      const frameText = normalizeProblemDetailText(
        this.readDescriptionFrameText(this.getDescriptionFrameElement())
      );
      const hasDescriptionList = this.getDescriptionListItems().length > 0;
      const text = normalizeProblemDetailText(
        String(document.body?.innerText || '')
      );

      if (frameText.length >= 120 && isLikelyProblemStatementText(frameText)) {
        return true;
      }

      if (statementNode && rightPanelText.length >= 120) {
        return true;
      }

      if (
        parseEmbeddedProblemData() &&
        (rightPanelText.length >= 100 ||
          frameText.length >= 80 ||
          hasDescriptionList)
      ) {
        return true;
      }

      if (text.length < 180) {
        return false;
      }

      return !/loading|please wait|fetching/i.test(text);
    }

    isProblemAccessBlocked() {
      const text = String(document.body?.innerText || '').toLowerCase();
      return /could you please stopping crawling|access denied|forbidden/.test(
        text
      );
    }

    hasMeaningfulProblemDetails(details) {
      if (!details || typeof details !== 'object') return false;

      const description = String(details.description || '').trim();
      const inputFormat = String(details.inputFormat || '').trim();
      const outputFormat = String(details.outputFormat || '').trim();
      const constraints = String(details.constraints || '').trim();
      const examples = Array.isArray(details.examples) ? details.examples : [];
      const platform = String(details.platform || this.platform || '')
        .trim()
        .toLowerCase();

      const hasInputOutput = inputFormat.length > 0 && outputFormat.length > 0;
      const hasCoreStructuredData =
        hasInputOutput || constraints.length > 0 || examples.length > 0;

      if (platform === 'vjudge') {
        const hasStatementDescription =
          description.length >= 20 && isLikelyProblemStatementText(description);

        return hasStatementDescription || hasCoreStructuredData;
      }

      return description.length >= 20 || hasCoreStructuredData;
    }

    async handleExtractSubmissionMessage(sendResponse) {
      try {
        if (this.detectPageType() !== 'submission') {
          sendResponse({
            success: false,
            nonRetriable: true,
            error: 'Not on VJudge submission page',
          });
          return;
        }

        const submission = await this.extractSubmission();
        this.extractionResult = submission;

        if (!submission) {
          sendResponse({
            success: false,
            nonRetriable: true,
            error: 'No submission found',
          });
          return;
        }

        if (submission.sourceCode && submission.sourceCode.trim()) {
          this.extractionComplete = true;
          sendResponse({ success: true, data: submission, error: null });
          return;
        }

        if (submission._loginRequired) {
          sendResponse({
            success: false,
            nonRetriable: true,
            data: submission,
            error: 'Login required to browse this VJudge code',
          });
          return;
        }

        sendResponse({
          success: false,
          pending: true,
          data: submission,
          error: 'Source code not available yet',
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
            error: 'Not on VJudge problem page yet',
          });
          return;
        }

        if (this.isProblemAccessBlocked()) {
          sendResponse({
            success: false,
            nonRetriable: true,
            error: 'VJudge blocked problem details request',
          });
          return;
        }

        if (!this.isProblemPageReady()) {
          sendResponse({
            success: false,
            pending: true,
            error: 'VJudge problem page still loading',
          });
          return;
        }

        const details = await this.extractProblemDetails();
        if (this.hasMeaningfulProblemDetails(details)) {
          sendResponse({ success: true, data: details, error: null });
          return;
        }

        sendResponse({
          success: false,
          pending: true,
          error: 'VJudge problem details not ready yet',
        });
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
      if (!(browserAPI && browserAPI.storage)) {
        log('Browser storage API not available');
        return;
      }

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
            log('Submission cached successfully');
            this.autoSyncIfEnabled(submission);
          });
        } else {
          log('Submission already cached');
        }
      });
    }

    autoSyncIfEnabled(submission) {
      if (!browserAPI || !browserAPI.runtime) return;

      browserAPI.storage.sync.get(
        ['autoFetchEnabled', 'extensionToken'],
        (result) => {
          if (result.autoFetchEnabled && result.extensionToken) {
            log('Auto-syncing submission to backend...');

            browserAPI.runtime.sendMessage(
              { action: 'syncSubmission', submission },
              (response) => {
                if (response && response.success) {
                  log('Auto-sync successful!');
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

      log('Initializing extractor...');
      this.setupMessageListener();

      const pageType = this.detectPageType();
      log('Page type:', pageType);

      if (pageType === 'submission') {
        const submission = await this.extractSubmission();
        this.extractionResult = submission;
        this.extractionComplete = Boolean(submission?.sourceCode);

        if (submission?.sourceCode) {
          this.storeSubmission(submission);
          await this.autoSyncIfEnabled(submission);
        }
      }

      this.initialized = true;
      log('Extractor initialized');
    }
  }

  function initExtractor() {
    log('Content script loaded on:', window.location.href);
    const extractor = new VJudgeExtractor();
    extractor.init();
    window.__neupcExtractor = extractor;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
})();
