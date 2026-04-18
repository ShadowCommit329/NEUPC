/**
 * NEUPC Browser Extension - Base Extractor Class
 * All platform-specific extractors inherit from this class
 *
 * This provides a unified interface for:
 * - Page type detection
 * - Submission extraction
 * - Source code capture
 * - Auto-sync handling
 * - Message handling between content script and background
 */

import { PLATFORMS, SubmissionSchema } from '../common/constants.js';
import {
  log,
  logError,
  logWarn,
  browserAPI,
  waitForElement,
  safeQuery,
  safeQueryAll,
  extractText,
  sleep,
  normalizeVerdict,
  normalizeLanguage,
  parseDate,
  parseTime,
  parseMemory,
  sanitizeSubmission,
  validateSubmission,
  isAcceptedVerdict,
  buildProblemUrl,
} from '../common/utils.js';
import {
  isAutoSyncEnabled,
  isCaptureSourceCodeEnabled,
  getExtensionToken,
  addCachedSubmission,
  updateSyncStats,
  updateLastSync,
  isSubmissionCached,
} from '../common/storage.js';

// ============================================================
// PAGE TYPES
// ============================================================

export const PAGE_TYPES = {
  SUBMISSION: 'submission', // Single submission view with source code
  PROBLEM: 'problem', // Problem statement page
  SUBMISSIONS: 'submissions', // List of submissions (status page)
  PROFILE: 'profile', // User profile page
  CONTEST: 'contest', // Contest page
  UNKNOWN: 'unknown', // Unknown page type
};

// ============================================================
// BASE EXTRACTOR CLASS
// ============================================================

/**
 * Base class for platform extractors
 * All platform-specific extractors should extend this class
 */
export class BaseExtractor {
  constructor() {
    this.platform = this.getPlatformId();
    this.platformConfig = PLATFORMS[this.platform];
    this.initialized = false;
    this.observing = false;
    this.observer = null;
    this.extractionResult = null;
    this.extractionComplete = false;
    this.extractionInProgress = false;
  }

  // ============================================================
  // ABSTRACT METHODS (must be implemented by child classes)
  // ============================================================

  /**
   * Get platform identifier (MUST be implemented by child class)
   * @returns {string} - Platform ID (e.g., 'codeforces', 'atcoder')
   */
  getPlatformId() {
    throw new Error('getPlatformId() must be implemented by child class');
  }

  /**
   * Detect the type of current page (MUST be implemented by child class)
   * @returns {string} - One of PAGE_TYPES values
   */
  detectPageType() {
    throw new Error('detectPageType() must be implemented by child class');
  }

  /**
   * Extract submission data from single submission page (MUST be implemented)
   * @returns {Promise<Object|null>} - Submission object or null
   */
  async extractSubmission() {
    throw new Error('extractSubmission() must be implemented by child class');
  }

  // ============================================================
  // OPTIONAL OVERRIDE METHODS
  // ============================================================

  /**
   * Get platform display name (optional override)
   * @returns {string}
   */
  getPlatformName() {
    return this.platformConfig?.name || this.platform;
  }

  /**
   * Extract multiple submissions from status/submissions page (optional)
   * @returns {Promise<Object[]>} - Array of submission objects
   */
  async extractSubmissions() {
    log(
      this.platform,
      'extractSubmissions() not implemented, returning empty array'
    );
    return [];
  }

  /**
   * Get user handle from current page (optional)
   * @returns {Promise<string|null>}
   */
  async getUserHandle() {
    return null;
  }

  /**
   * Extract source code from submission page (optional)
   * Called if extractSubmission doesn't include source code
   * @returns {Promise<string|null>}
   */
  async extractSourceCode() {
    // Default implementation - try common selectors
    const codeSelectors = [
      'pre#program-source-text',
      '#program-source-text',
      '.source-code pre',
      '.prettyprint.program-source',
      'pre.prettyprint',
      '.program-source',
      'pre[class*="source"]',
      '#sourceCodeTextarea',
      'pre.code',
      '.submission-code pre',
      'code.hljs',
      '.ace_content',
      '.CodeMirror-code',
    ];

    for (const selector of codeSelectors) {
      const codeEl = safeQuery(selector);
      if (codeEl && codeEl.textContent.trim().length > 10) {
        return codeEl.textContent;
      }
    }

    return null;
  }

  /**
   * Extract problem metadata from problem page (optional)
   * @returns {Promise<Object|null>}
   */
  async extractProblem() {
    return null;
  }

  /**
   * Observe for submission success on problem page (optional)
   * Used for auto-sync when user submits on problem page
   */
  observeSubmissionSuccess() {
    // Default: no observation
    log(this.platform, 'observeSubmissionSuccess() not implemented');
  }

  /**
   * Get selectors for waiting on page load (optional)
   * @returns {string[]}
   */
  getPageLoadSelectors() {
    return ['body'];
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Initialize the extractor
   * Called automatically when the content script loads
   */
  async init() {
    if (this.initialized) return;

    log(this.platform, 'Initializing extractor for:', window.location.href);

    try {
      // Wait for page to be ready
      await this.waitForPageReady();

      // Check if auto-sync is enabled
      const autoSyncEnabled = await isAutoSyncEnabled();
      const hasToken = await getExtensionToken();

      if (!hasToken) {
        log(this.platform, 'No extension token, skipping initialization');
        this.initialized = true;
        return;
      }

      // Detect current page type
      const pageType = this.detectPageType();
      log(this.platform, `Page type detected: ${pageType}`);

      // Initialize based on page type
      switch (pageType) {
        case PAGE_TYPES.SUBMISSION:
          await this.handleSubmissionPage(autoSyncEnabled);
          break;

        case PAGE_TYPES.SUBMISSIONS:
          await this.handleSubmissionsPage(autoSyncEnabled);
          break;

        case PAGE_TYPES.PROBLEM:
          if (autoSyncEnabled) {
            await this.setupProblemPageWatcher();
          }
          break;

        case PAGE_TYPES.PROFILE:
          // Could extract user stats here
          break;

        default:
          log(this.platform, 'Unknown page type, waiting for messages');
      }

      this.initialized = true;
      log(this.platform, 'Extractor initialized successfully');
    } catch (error) {
      logError(this.platform, 'Initialization failed:', error);
      this.initialized = true; // Mark as initialized to prevent repeated attempts
    }
  }

  /**
   * Wait for page to be ready for extraction
   */
  async waitForPageReady() {
    const selectors = this.getPageLoadSelectors();

    try {
      // Wait for at least one selector or timeout
      await Promise.race([
        ...selectors.map((s) => waitForElement(s, 10000)),
        sleep(5000), // Max 5 second wait
      ]);
    } catch (error) {
      logWarn(this.platform, 'Page load wait timed out, continuing anyway');
    }

    // Additional small delay for dynamic content
    await sleep(500);
  }

  // ============================================================
  // PAGE HANDLERS
  // ============================================================

  /**
   * Handle single submission page
   * @param {boolean} autoSyncEnabled - Whether to auto-sync
   */
  async handleSubmissionPage(autoSyncEnabled) {
    try {
      log(this.platform, 'Processing submission page');

      this.extractionInProgress = true;
      const submission = await this.extractSubmission();
      this.extractionResult = submission;
      this.extractionComplete = true;
      this.extractionInProgress = false;

      if (!submission) {
        log(this.platform, 'No submission found on page');
        return;
      }

      // Try to extract source code if not already present
      if (!submission.sourceCode) {
        const captureSource = await isCaptureSourceCodeEnabled();
        if (captureSource) {
          submission.sourceCode = await this.extractSourceCode();
        }
      }

      log(this.platform, 'Extracted submission:', {
        problemId: submission.problemId,
        verdict: submission.verdict,
        hasCode: !!submission.sourceCode,
        codeLength: submission.sourceCode?.length || 0,
      });

      // Auto-sync if enabled and submission is accepted
      if (
        autoSyncEnabled &&
        isAcceptedVerdict(submission.verdict) &&
        submission.sourceCode
      ) {
        await this.autoSyncSubmission(submission);
      }
    } catch (error) {
      logError(this.platform, 'Error handling submission page:', error);
      this.extractionComplete = true;
      this.extractionInProgress = false;
    }
  }

  /**
   * Handle submissions list page
   * @param {boolean} autoSyncEnabled - Whether to auto-sync
   */
  async handleSubmissionsPage(autoSyncEnabled) {
    try {
      log(this.platform, 'Processing submissions page');

      const submissions = await this.extractSubmissions();

      if (submissions.length === 0) {
        log(this.platform, 'No submissions found on page');
        return;
      }

      log(this.platform, `Found ${submissions.length} submissions`);

      // For now, just store them - bulk sync can be triggered manually
      this.extractionResult = submissions;
      this.extractionComplete = true;
    } catch (error) {
      logError(this.platform, 'Error handling submissions page:', error);
    }
  }

  /**
   * Setup watcher for problem page to detect new submissions
   */
  async setupProblemPageWatcher() {
    try {
      log(this.platform, 'Setting up problem page watcher');
      this.observeSubmissionSuccess();
    } catch (error) {
      logError(this.platform, 'Error setting up problem page watcher:', error);
    }
  }

  // ============================================================
  // SYNC OPERATIONS
  // ============================================================

  /**
   * Auto-sync a submission to the backend
   * @param {Object} submission - Submission data
   */
  async autoSyncSubmission(submission) {
    try {
      // Check if already synced
      const isCached = await isSubmissionCached(
        this.platform,
        submission.submissionId
      );
      if (isCached) {
        log(this.platform, 'Submission already synced, skipping');
        return;
      }

      log(this.platform, 'Auto-syncing submission:', submission.submissionId);

      // Send to background script for API sync
      const response = await browserAPI.runtime.sendMessage({
        action: 'syncSubmission',
        submission: {
          platform: this.platform,
          problemId: submission.problemId,
          problemName: submission.problemName,
          problemUrl: submission.problemUrl,
          problemDescription: submission.problemDescription,
          solutionCode: submission.sourceCode,
          language: submission.language,
          submissionId: submission.submissionId,
          submissionUrl: submission.submissionUrl,
          verdict: submission.verdict,
          executionTime: submission.executionTime,
          memoryUsage: submission.memoryUsed,
          submittedAt: submission.submittedAt,
          contestId: submission.contestId,
          difficultyRating: submission.difficultyRating,
          tags: submission.tags,
        },
      });

      if (response?.success) {
        log(this.platform, 'Auto-sync successful');
        await addCachedSubmission(this.platform, submission);
        await updateSyncStats(this.platform, 1, true);
        await updateLastSync(this.platform);
      } else {
        logWarn(this.platform, 'Auto-sync failed:', response?.error);
      }
    } catch (error) {
      logError(this.platform, 'Auto-sync error:', error);
    }
  }

  // ============================================================
  // MESSAGE HANDLING
  // ============================================================

  /**
   * Setup message listener for communication with background script
   */
  setupMessageListener() {
    browserAPI.runtime.onMessage.addListener(
      (request, sender, sendResponse) => {
        log(this.platform, 'Message received:', request.action);

        switch (request.action) {
          case 'extractSubmission':
            this.handleExtractSubmissionMessage(sendResponse);
            return true; // Keep channel open for async response

          case 'extractSubmissions':
            this.handleExtractSubmissionsMessage(sendResponse);
            return true;

          case 'ping':
            sendResponse({
              success: true,
              platform: this.platform,
              pageType: this.detectPageType(),
              initialized: this.initialized,
            });
            return true;

          case 'getPageInfo':
            sendResponse({
              success: true,
              platform: this.platform,
              pageType: this.detectPageType(),
              url: window.location.href,
            });
            return true;

          default:
            sendResponse({ success: false, error: 'Unknown action' });
            return true;
        }
      }
    );
  }

  /**
   * Handle extract submission message
   * @param {Function} sendResponse - Response callback
   */
  async handleExtractSubmissionMessage(sendResponse) {
    try {
      // If already extracted, return cached result
      if (this.extractionComplete && this.extractionResult) {
        sendResponse({ success: true, data: this.extractionResult });
        return;
      }

      // If extraction in progress, wait for it
      if (this.extractionInProgress) {
        // Wait up to 10 seconds for extraction to complete
        for (let i = 0; i < 20; i++) {
          await sleep(500);
          if (this.extractionComplete) {
            sendResponse({
              success: !!this.extractionResult,
              data: this.extractionResult,
            });
            return;
          }
        }
        sendResponse({ success: false, error: 'Extraction timeout' });
        return;
      }

      // Start new extraction
      this.extractionInProgress = true;
      const submission = await this.extractSubmission();

      // Try to get source code if missing
      if (submission && !submission.sourceCode) {
        submission.sourceCode = await this.extractSourceCode();
      }

      this.extractionResult = submission;
      this.extractionComplete = true;
      this.extractionInProgress = false;

      sendResponse({
        success: !!submission?.sourceCode,
        data: submission,
        error: submission ? null : 'No submission found',
      });
    } catch (error) {
      logError(this.platform, 'Extract submission error:', error);
      this.extractionComplete = true;
      this.extractionInProgress = false;
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Handle extract submissions message (for bulk operations)
   * @param {Function} sendResponse - Response callback
   */
  async handleExtractSubmissionsMessage(sendResponse) {
    try {
      const submissions = await this.extractSubmissions();
      sendResponse({ success: true, data: submissions });
    } catch (error) {
      logError(this.platform, 'Extract submissions error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // ============================================================
  // MUTATION OBSERVER
  // ============================================================

  /**
   * Setup mutation observer for dynamic content
   * @param {string} selector - Element to observe
   * @param {Function} callback - Callback when mutations occur
   */
  setupObserver(selector, callback) {
    if (this.observing) {
      log(this.platform, 'Observer already active');
      return;
    }

    const target = document.querySelector(selector) || document.body;

    this.observer = new MutationObserver((mutations) => {
      callback(mutations);
    });

    this.observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-verdict'],
    });

    this.observing = true;
    log(this.platform, 'Observer setup complete');
  }

  /**
   * Stop mutation observer
   */
  stopObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      this.observing = false;
      log(this.platform, 'Observer stopped');
    }
  }

  // ============================================================
  // UTILITY METHODS FOR CHILD CLASSES
  // ============================================================

  /**
   * Create a standard submission object with defaults
   * @param {Object} data - Partial submission data
   * @returns {Object}
   */
  createSubmission(data) {
    return {
      platform: this.platform,
      problemId: data.problemId || '',
      problemName: data.problemName || '',
      problemUrl: data.problemUrl || '',
      submissionId: data.submissionId || '',
      submissionUrl: data.submissionUrl || window.location.href,
      verdict: normalizeVerdict(data.verdict),
      language: normalizeLanguage(data.language),
      sourceCode: data.sourceCode || null,
      executionTime: parseTime(data.executionTime),
      memoryUsed: parseMemory(data.memoryUsed),
      submittedAt: parseDate(data.submittedAt) || null,
      contestId: data.contestId || '',
      difficultyRating: data.difficultyRating || null,
      tags: Array.isArray(data.tags) ? data.tags : [],
      handle: data.handle || '',
      problemDescription: data.problemDescription || '',
    };
  }

  /**
   * Build problem URL for this platform
   * @param {string} problemId - Problem ID
   * @param {string} contestId - Optional contest ID
   * @returns {string}
   */
  buildProblemUrl(problemId, contestId = null) {
    return buildProblemUrl(this.platform, problemId, contestId);
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  /**
   * Cleanup on extractor destruction
   */
  destroy() {
    this.stopObserver();
    this.initialized = false;
    this.extractionComplete = false;
    this.extractionResult = null;
    log(this.platform, 'Extractor destroyed');
  }
}

// ============================================================
// AUTO-INITIALIZATION HELPER
// ============================================================

/**
 * Auto-initialize extractor when DOM is ready
 * @param {typeof BaseExtractor} ExtractorClass - Extractor class to instantiate
 */
export function autoInit(ExtractorClass) {
  const initExtractor = async () => {
    try {
      const extractor = new ExtractorClass();
      extractor.setupMessageListener();
      await extractor.init();

      // Store reference for debugging
      window.__neupcExtractor = extractor;
    } catch (error) {
      console.error('[NEUPC] Failed to initialize extractor:', error);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
}

// ============================================================
// EXPORTS
// ============================================================

export default BaseExtractor;
