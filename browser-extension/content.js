/**
 * Content Script for Codeforces Submission Pages
 * Extracts solution code from submission pages and sends to backend
 */

(function () {
  'use strict';

  // Browser compatibility: Support both Chrome and Firefox
  const browserAPI = globalThis.chrome || globalThis.browser;

  console.log('[NeuPC] Content script loaded on Codeforces submission page');

  // Extract submission details from the page
  function extractSubmissionData() {
    try {
      // Get submission ID from URL
      const urlParts = window.location.pathname.split('/');
      const submissionId = urlParts[urlParts.length - 1];

      // Get contest/problemset ID
      let contestId = null;
      if (window.location.pathname.includes('/contest/')) {
        contestId = urlParts[2];
      }

      // Extract problem ID and name from the page
      let problemId = null;
      let problemName = null;
      let problemUrl = null;

      const problemLink = document.querySelector(
        'a[href*="/problem/"], a[href*="/problemset/problem/"]'
      );
      if (problemLink) {
        const href = problemLink.getAttribute('href');
        problemName = problemLink.textContent.trim();
        problemUrl = `https://codeforces.com${href}`;

        // Extract problem ID from URL
        const problemMatch = href.match(/problem\/(\w+)/);
        if (problemMatch) {
          if (contestId) {
            problemId = `${contestId}-${problemMatch[1]}`;
          } else {
            problemId = problemMatch[1];
          }
        }
      }

      // Extract source code
      const sourceCodePre = document.querySelector('#program-source-text');
      if (!sourceCodePre) {
        console.warn('[NeuPC] Source code element not found');
        return null;
      }
      const sourceCode = sourceCodePre.textContent.trim();

      // Extract language
      let language = null;
      const languageRow = Array.from(document.querySelectorAll('tr')).find(
        (tr) => tr.textContent.includes('Programming language')
      );
      if (languageRow) {
        const languageCell = languageRow.querySelector('td');
        if (languageCell) {
          language = languageCell.textContent.trim();
        }
      }

      // Extract verdict - check multiple possible selectors
      let verdict = 'UNKNOWN';

      // Method 1: Check specific verdict classes
      const acceptedElement = document.querySelector('.verdict-accepted');
      if (acceptedElement) {
        verdict = 'AC';
      } else {
        // Method 2: Check verdict wrapper
        const verdictWrapper = document.querySelector(
          '.verdict-format-judge, .submissionVerdictWrapper, [class*="verdict"]'
        );
        if (verdictWrapper) {
          const verdictText = verdictWrapper.textContent.toUpperCase().trim();
          if (verdictText.includes('ACCEPTED') || verdictText === 'OK') {
            verdict = 'AC';
          } else if (
            verdictText.includes('WRONG ANSWER') ||
            verdictText.includes('WRONG_ANSWER')
          ) {
            verdict = 'WA';
          } else if (
            verdictText.includes('TIME LIMIT') ||
            verdictText.includes('TIME_LIMIT')
          ) {
            verdict = 'TLE';
          } else if (
            verdictText.includes('MEMORY LIMIT') ||
            verdictText.includes('MEMORY_LIMIT')
          ) {
            verdict = 'MLE';
          } else if (
            verdictText.includes('RUNTIME ERROR') ||
            verdictText.includes('RUNTIME_ERROR')
          ) {
            verdict = 'RE';
          } else if (
            verdictText.includes('COMPILATION ERROR') ||
            verdictText.includes('COMPILATION_ERROR')
          ) {
            verdict = 'CE';
          } else if (verdictText.includes('IDLENESS')) {
            verdict = 'ILE';
          } else if (verdictText.includes('HACKED')) {
            verdict = 'HACKED';
          } else if (verdictText.includes('SKIPPED')) {
            verdict = 'SKIPPED';
          } else if (verdictText.includes('PARTIAL')) {
            verdict = 'PARTIAL';
          }
        }

        // Method 3: Check in the info table rows
        if (verdict === 'UNKNOWN') {
          const rows = document.querySelectorAll('tr');
          for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              const label = cells[0].textContent.trim().toLowerCase();
              if (label.includes('verdict') || label.includes('result')) {
                const value = cells[1].textContent.toUpperCase().trim();
                if (value.includes('ACCEPTED') || value === 'OK') {
                  verdict = 'AC';
                } else if (value.includes('WRONG')) {
                  verdict = 'WA';
                } else if (value.includes('TIME')) {
                  verdict = 'TLE';
                } else if (value.includes('MEMORY')) {
                  verdict = 'MLE';
                } else if (value.includes('RUNTIME')) {
                  verdict = 'RE';
                } else if (value.includes('COMPILATION')) {
                  verdict = 'CE';
                }
                break;
              }
            }
          }
        }
      }

      // Extract tags/topics
      const tags = [];
      const tagElements = document.querySelectorAll('.tag-box');
      tagElements.forEach((tag) => {
        tags.push(tag.textContent.trim());
      });

      // Extract difficulty rating (if available)
      let difficultyRating = null;
      const ratingElement = document.querySelector('[title*="Difficulty:"]');
      if (ratingElement) {
        const ratingMatch = ratingElement.textContent.match(/\d+/);
        if (ratingMatch) {
          difficultyRating = parseInt(ratingMatch[0]);
        }
      }

      return {
        submissionId,
        contestId,
        problemId,
        problemName,
        problemUrl,
        sourceCode,
        language,
        verdict,
        topics: tags,
        difficultyRating,
        platform: 'codeforces',
      };
    } catch (error) {
      console.error('[NeuPC] Error extracting submission data:', error);
      return null;
    }
  }

  // Check if auto-fetch is enabled for this user
  async function isAutoFetchEnabled() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get(
        ['autoFetchEnabled', 'extensionToken'],
        (result) => {
          resolve(result.autoFetchEnabled === true && result.extensionToken);
        }
      );
    });
  }

  // Send submission data to backend
  async function sendToBackend(data) {
    try {
      const { extensionToken, apiEndpoint } = await new Promise((resolve) => {
        browserAPI.storage.sync.get(['extensionToken', 'apiEndpoint'], resolve);
      });

      if (!extensionToken) {
        console.warn('[NeuPC] No API token configured');
        return { success: false, error: 'No API token configured' };
      }

      const endpoint =
        apiEndpoint ||
        'http://localhost:3000/api/problem-solving/solutions/auto-fetch';

      console.log('[NeuPC] Sending solution to backend:', {
        endpoint,
        problemId: data.problemId,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${extensionToken}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('[NeuPC] Solution sent successfully:', result);
        showNotification('Solution auto-fetched successfully!', 'success');
        return { success: true, result };
      } else {
        console.error('[NeuPC] Failed to send solution:', result);
        showNotification(`Failed to auto-fetch: ${result.error}`, 'error');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[NeuPC] Error sending to backend:', error);
      showNotification('Error connecting to NeuPC', 'error');
      return { success: false, error: error.message };
    }
  }

  // Show notification on page
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `neupc-notification neupc-${type}`;
    notification.textContent = `[NeuPC] ${message}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Main execution
  async function main() {
    // Wait for page to fully load
    if (document.readyState !== 'complete') {
      window.addEventListener('load', main);
      return;
    }

    // Check if auto-fetch is enabled
    const enabled = await isAutoFetchEnabled();
    if (!enabled) {
      console.log('[NeuPC] Auto-fetch is disabled');
      return;
    }

    // Extract submission data
    const data = extractSubmissionData();
    if (!data) {
      console.warn('[NeuPC] Failed to extract submission data');
      return;
    }

    console.log('[NeuPC] Extracted submission data:', data);

    // Send to backend
    await sendToBackend(data);
  }

  // Listen for messages from popup/background
  browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchSolution') {
      main().then(() => sendResponse({ success: true }));
      return true; // Keep channel open for async response
    }

    // Handle extraction request from bulk fetch
    if (request.action === 'extractSubmission') {
      console.log('[NeuPC] Received extractSubmission request');

      const data = extractSubmissionData();
      if (data && data.sourceCode) {
        console.log(
          '[NeuPC] Extraction successful:',
          data.problemId,
          'verdict:',
          data.verdict
        );
        sendResponse({
          success: true,
          data: {
            problemId: data.problemId,
            problemName: data.problemName,
            problemUrl: data.problemUrl,
            language: data.language,
            sourceCode: data.sourceCode,
            submittedAt: new Date().toISOString(),
            problemRating: data.difficultyRating,
            problemTags: data.topics || [],
            verdict: data.verdict,
          },
        });
      } else if (data && !data.sourceCode) {
        // Source code not loaded yet, tell caller to retry
        console.warn('[NeuPC] Source code not loaded yet, pending...');
        sendResponse({ pending: true });
      } else {
        console.warn('[NeuPC] Extraction failed - data not available yet');
        sendResponse({ pending: true });
      }
      return true;
    }
  });

  // Auto-run on page load
  if (document.readyState === 'complete') {
    main();
  } else {
    window.addEventListener('load', main);
  }
})();
