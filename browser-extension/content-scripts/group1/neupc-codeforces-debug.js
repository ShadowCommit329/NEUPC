/**
 * DEBUG VERSION - Codeforces Extractor with Extra Logging
 * Use this temporarily to debug why the extension isn't working
 */

// Add debug logging at the very top
console.log('🔍 [DEBUG] Codeforces content script file loaded!');
console.log('🔍 [DEBUG] Current URL:', window.location.href);
console.log('🔍 [DEBUG] Document ready state:', document.readyState);
console.log(
  '🔍 [DEBUG] Browser API available:',
  typeof chrome !== 'undefined' || typeof browser !== 'undefined'
);

// Show alert to confirm script is running
alert('✅ NEUPC Extension: Codeforces script is running!');

import { BaseExtractor, autoInit } from '../_base.js';
import {
  extractText,
  extractAttr,
  safeQuery,
  parseDate,
  waitForElement,
  log,
} from '../../common/utils.js';

console.log('🔍 [DEBUG] Imports successful!');

class CodeforcesExtractor extends BaseExtractor {
  getPlatformId() {
    console.log('🔍 [DEBUG] getPlatformId called');
    return 'codeforces';
  }

  detectPageType() {
    console.log('🔍 [DEBUG] detectPageType called');
    const path = window.location.pathname;
    console.log('🔍 [DEBUG] Path:', path);

    if (path.includes('/submission/')) {
      console.log('🔍 [DEBUG] Detected: submission page');
      return 'submission';
    }
    if (path.includes('/my') || path.includes('/status')) {
      console.log('🔍 [DEBUG] Detected: submissions page');
      return 'submissions';
    }
    if (path.includes('/problem/')) {
      console.log('🔍 [DEBUG] Detected: problem page');
      return 'problem';
    }

    console.log('🔍 [DEBUG] Detected: unknown page type');
    return 'unknown';
  }

  async getUserHandle() {
    console.log('🔍 [DEBUG] getUserHandle called');
    const handleElement = safeQuery('a[href^="/profile/"]');
    if (handleElement) {
      const href = handleElement.getAttribute('href');
      const match = href.match(/\/profile\/([^/]+)/);
      if (match) {
        console.log('🔍 [DEBUG] Found user handle:', match[1]);
        return match[1];
      }
    }
    console.log('🔍 [DEBUG] No user handle found');
    return null;
  }

  async extractSubmission() {
    console.log('🔍 [DEBUG] extractSubmission called');

    try {
      const submissionId =
        window.location.pathname.match(/\/submission\/(\d+)/)?.[1];
      console.log('🔍 [DEBUG] Submission ID:', submissionId);

      if (!submissionId) {
        console.log('🔍 [DEBUG] No submission ID found in URL');
        return null;
      }

      console.log('🔍 [DEBUG] Waiting for .roundbox element...');
      await waitForElement('.roundbox', 5000).catch(() => {
        console.log('🔍 [DEBUG] .roundbox element not found after 5s');
      });

      console.log('🔍 [DEBUG] Extracting submission data...');

      const submission = {
        submissionId,
        problemId: 'TEST123',
        problemName: 'Test Problem',
        verdict: 'AC',
        language: 'GNU C++17',
        executionTime: 100,
        memoryUsed: 1024,
        submittedAt: new Date().toISOString(),
        sourceCode: '// Test code',
        submissionUrl: window.location.href,
      };

      console.log('🔍 [DEBUG] Extracted submission:', submission);
      return submission;
    } catch (error) {
      console.error('🔍 [DEBUG] Error in extractSubmission:', error);
      return null;
    }
  }
}

console.log('🔍 [DEBUG] CodeforcesExtractor class defined');
console.log('🔍 [DEBUG] Calling autoInit...');

// Auto-initialize when DOM loads
autoInit(CodeforcesExtractor);

console.log('🔍 [DEBUG] autoInit called, waiting for initialization...');
