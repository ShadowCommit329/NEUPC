// Add these functions to popup.js for bulk import functionality

// Add after the existing event listeners in popup.js

// ============================================================
// BULK HISTORY IMPORT
// ============================================================

const bulkPlatformSelect = document.getElementById('bulkPlatform');
const userHandleInput = document.getElementById('userHandle');
const importHistoryBtn = document.getElementById('importHistoryBtn');
const importStatus = document.getElementById('importStatus');
const importProgress = document.getElementById('importProgress');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

importHistoryBtn.addEventListener('click', async () => {
  const platform = bulkPlatformSelect.value;
  const handle = userHandleInput.value.trim();

  if (!handle) {
    showStatus(importStatus, 'Please enter your username/handle', 'warning');
    return;
  }

  const extensionToken = extensionTokenInput.value;
  if (!extensionToken) {
    showStatus(
      importStatus,
      'Please configure your session token first',
      'warning'
    );
    return;
  }

  importHistoryBtn.disabled = true;
  importHistoryBtn.innerHTML = '<span class="spinner"></span>Importing...';
  importProgress.classList.remove('hidden');

  showStatus(
    importStatus,
    `Fetching submission history from ${platform}...`,
    'info'
  );

  try {
    // Step 1: Collect submissions from platform API
    const response = await new Promise((resolve) => {
      browserAPI.runtime.sendMessage(
        { action: 'collectBulkHistory', platform, handle },
        resolve
      );
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to collect submissions');
    }

    const submissions = response.submissions || [];
    if (submissions.length === 0) {
      showStatus(
        importStatus,
        `No submissions found for ${handle} on ${platform}`,
        'warning'
      );
      return;
    }

    showStatus(
      importStatus,
      `Found ${submissions.length} submissions. Starting sync...`,
      'info'
    );

    // Step 2: Cache submissions locally first
    for (let i = 0; i < submissions.length; i++) {
      const submission = submissions[i];

      // Store in cache
      await new Promise((resolve) => {
        browserAPI.storage.local.get(['cachedSubmissions'], (result) => {
          const cached = result.cachedSubmissions || {};
          const platformCache = cached[platform] || [];

          // Check if not already cached
          if (
            !platformCache.some(
              (s) => s.submissionId === submission.submissionId
            )
          ) {
            platformCache.unshift(submission);
          }

          cached[platform] = platformCache;
          browserAPI.storage.local.set({ cachedSubmissions: cached }, resolve);
        });
      });

      // Update progress
      const progress = ((i + 1) / submissions.length) * 50; // 50% for caching
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `Cached ${i + 1} / ${submissions.length}`;
    }

    showStatus(
      importStatus,
      `Cached ${submissions.length} submissions. Syncing to NEUPC...`,
      'info'
    );

    // Step 3: Sync all cached submissions to backend
    const syncResponse = await new Promise((resolve) => {
      browserAPI.runtime.sendMessage({ action: 'syncAllSubmissions' }, resolve);
    });

    if (syncResponse && syncResponse.success) {
      const { synced, failed } = syncResponse;

      // Final progress
      progressBar.style.width = '100%';
      progressText.textContent = `Complete: ${synced} synced, ${failed} failed`;

      if (synced > 0 && failed === 0) {
        showStatus(
          importStatus,
          `🎉 Successfully imported ${synced} submissions from ${platform}!`,
          'success'
        );
      } else if (synced > 0) {
        showStatus(
          importStatus,
          `⚠️ Imported ${synced} submissions, ${failed} failed. Check your token.`,
          'warning'
        );
      } else {
        showStatus(
          importStatus,
          `❌ Failed to sync submissions. Check your connection and token.`,
          'error'
        );
      }
    } else {
      throw new Error(syncResponse?.error || 'Sync failed');
    }

    // Refresh stats
    loadCachedStats();
  } catch (error) {
    console.error('Import error:', error);
    showStatus(importStatus, `Import failed: ${error.message}`, 'error');
  } finally {
    importHistoryBtn.disabled = false;
    importHistoryBtn.textContent = 'Import All Submissions';

    setTimeout(() => {
      importProgress.classList.add('hidden');
    }, 5000);
  }
});

// Auto-fill handle from settings if available
browserAPI.storage.sync.get(['savedHandles'], (result) => {
  const handles = result.savedHandles || {};
  bulkPlatformSelect.addEventListener('change', () => {
    const platform = bulkPlatformSelect.value;
    if (handles[platform]) {
      userHandleInput.value = handles[platform];
    }
  });
});

// Save handle when entered
userHandleInput.addEventListener('blur', () => {
  const platform = bulkPlatformSelect.value;
  const handle = userHandleInput.value.trim();

  if (handle) {
    browserAPI.storage.sync.get(['savedHandles'], (result) => {
      const handles = result.savedHandles || {};
      handles[platform] = handle;
      browserAPI.storage.sync.set({ savedHandles: handles });
    });
  }
});
