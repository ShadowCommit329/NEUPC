/**
 * NEUPC Extension Popup Script
 * Multi-Platform Solution Sync
 */

const browserAPI = globalThis.chrome || globalThis.browser;

// ============================================================
// PLATFORM CONFIGURATION
// ============================================================

const PLATFORMS = {
  codeforces: {
    id: 'codeforces',
    name: 'Codeforces',
    shortName: 'CF',
    handleLabel: 'Codeforces Handle',
    handleHelp: 'Connect your Codeforces handle in NEUPC account settings',
    supportsBulkImport: true,
    supportsFullImport: true,
    domains: ['codeforces.com'],
  },
  atcoder: {
    id: 'atcoder',
    name: 'AtCoder',
    shortName: 'AC',
    handleLabel: 'AtCoder Username',
    handleHelp: 'Connect your AtCoder username in NEUPC account settings',
    supportsBulkImport: true,
    supportsFullImport: true,
    domains: ['atcoder.jp'],
  },
  leetcode: {
    id: 'leetcode',
    name: 'LeetCode',
    shortName: 'LC',
    handleLabel: 'LeetCode Username',
    handleHelp: 'Connect your LeetCode username in NEUPC account settings',
    supportsBulkImport: true,
    supportsFullImport: true,
    domains: ['leetcode.com', 'leetcode.cn'],
  },
  toph: {
    id: 'toph',
    name: 'Toph',
    shortName: 'TP',
    handleLabel: 'Toph Username',
    handleHelp: 'Connect your Toph username in NEUPC account settings',
    supportsBulkImport: false, // Coming soon
    supportsFullImport: false,
    domains: ['toph.co'],
  },
};

/**
 * Detect platform from URL hostname
 */
function detectPlatformFromUrl(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const [platformId, platform] of Object.entries(PLATFORMS)) {
      if (platform.domains.some((domain) => hostname.includes(domain))) {
        return platformId;
      }
    }
  } catch (e) {
    // Invalid URL
  }
  return null;
}

function normalizeLeetCodeHandle(rawHandle) {
  const value = String(rawHandle || '').trim();
  if (!value) return '';

  let normalized = value.replace(/^@+/, '');
  normalized = normalized.replace(
    /^(?:https?:\/\/)?(?:www\.)?leetcode\.(?:com|cn)\//i,
    ''
  );
  normalized = normalized.replace(/^(?:u|profile)\//i, '');
  normalized = normalized.split(/[/?#]/)[0].replace(/^@+/, '').trim();
  return normalized;
}

document.addEventListener('DOMContentLoaded', () => {
  // ============================================================
  // ELEMENT REFERENCES
  // ============================================================

  // Tab elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Platform selector
  const platformChips = document.querySelectorAll('.platform-chip');
  let selectedPlatform = 'codeforces';

  // Import elements
  const handleInput = document.getElementById('handleInput');
  const handleLabel = document.getElementById('handleLabel');
  const handleHelp = document.getElementById('handleHelp');
  const refreshHandleBtn = document.getElementById('refreshHandleBtn');
  const verdictFilterSelect = document.getElementById('verdictFilter');
  const startImportBtn = document.getElementById('startImportBtn');
  const stopImportBtn = document.getElementById('stopImportBtn');
  const importStatus = document.getElementById('importStatus');

  // Mode toggle
  const modeBtns = document.querySelectorAll('.mode-btn');
  const quickModeBtn = document.querySelector('.mode-btn[data-mode="quick"]');
  const fullModeBtn = document.querySelector('.mode-btn[data-mode="full"]');
  const modeDescription = document.getElementById('modeDescription');
  let selectedMode = 'quick';

  // Progress elements
  const progressSection = document.getElementById('progressSection');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const phase1 = document.getElementById('phase1');
  const phase2 = document.getElementById('phase2');
  const phase3 = document.getElementById('phase3');

  // Results elements
  const resultsSection = document.getElementById('resultsSection');
  const totalFoundEl = document.getElementById('totalFound');
  const acFoundEl = document.getElementById('acFound');
  const importedEl = document.getElementById('imported');
  const totalFoundLabelEl = document.getElementById('totalFoundLabel');
  const acFoundLabelEl = document.getElementById('acFoundLabel');
  const importedLabelEl = document.getElementById('importedLabel');

  // Settings elements
  const connectedHandlesEl = document.getElementById('connectedHandles');
  const autoSyncEnabled = document.getElementById('autoSyncEnabled');
  const apiEndpointSelect = document.getElementById('apiEndpoint');
  const extensionTokenInput = document.getElementById('extensionToken');
  const toggleTokenBtn = document.getElementById('toggleTokenBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const testConnectionBtn = document.getElementById('testConnectionBtn');
  const settingsStatus = document.getElementById('settingsStatus');

  // Store for connected handles
  let connectedHandles = {};

  // ============================================================
  // STATUS HELPERS
  // ============================================================

  function showStatus(element, message, type = 'success') {
    element.textContent = message;
    element.className = `status ${type}`;
    element.classList.remove('hidden');

    if (type !== 'info') {
      setTimeout(() => element.classList.add('hidden'), 6000);
    }
  }

  function hideStatus(element) {
    element.classList.add('hidden');
  }

  function resetImportUI(options = {}) {
    const importInProgress = !stopImportBtn.classList.contains('hidden');
    if (importInProgress && !options.force) {
      return;
    }

    progressSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    stopImportBtn.classList.add('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = 'Initializing...';
    phase1.className = 'phase-dot';
    phase2.className = 'phase-dot';
    phase3.className = 'phase-dot';
    totalFoundEl.textContent = '0';
    acFoundEl.textContent = '0';
    importedEl.textContent = '0';
    startImportBtn.disabled = false;
    startImportBtn.textContent = 'Start Import';
  }

  function updateResultLabels() {
    const quick = selectedMode === 'quick';
    const verdictFilter = verdictFilterSelect.value;

    if (totalFoundLabelEl) {
      totalFoundLabelEl.textContent = quick ? 'Total Found' : 'Total Found';
    }

    if (acFoundLabelEl) {
      acFoundLabelEl.textContent =
        quick || verdictFilter === 'ac' ? 'AC Solutions' : 'Matched Filter';
    }

    if (importedLabelEl) {
      importedLabelEl.textContent = 'Recorded';
    }
  }

  // ============================================================
  // TAB SWITCHING
  // ============================================================

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      // Update button states
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Update content visibility
      tabContents.forEach((content) => {
        content.classList.remove('active');
        if (content.id === `tab-${targetTab}`) {
          content.classList.add('active');
        }
      });
    });
  });

  // ============================================================
  // PLATFORM SELECTION
  // ============================================================

  /**
   * Programmatically select a platform
   */
  function selectPlatform(platformId) {
    if (!PLATFORMS[platformId]) return;

    // Update chip selection
    platformChips.forEach((chip) => {
      chip.classList.remove('selected');
      if (chip.dataset.platform === platformId) {
        chip.classList.add('selected');
      }
    });

    selectedPlatform = platformId;
    resetImportUI();
    updatePlatformUI();
    updateResultLabels();
  }

  /**
   * Auto-detect platform from current tab URL
   */
  async function autoDetectPlatform() {
    try {
      const tabs = await browserAPI.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]?.url) {
        const detectedPlatform = detectPlatformFromUrl(tabs[0].url);
        if (detectedPlatform) {
          console.log('[NEUPC] Auto-detected platform:', detectedPlatform);
          selectPlatform(detectedPlatform);
        }
      }
    } catch (error) {
      console.log('[NEUPC] Could not auto-detect platform:', error.message);
    }
  }

  platformChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      if (chip.classList.contains('disabled')) {
        showStatus(
          importStatus,
          'Bulk import for this platform coming soon!',
          'warning'
        );
        return;
      }

      selectPlatform(chip.dataset.platform);
    });
  });

  function updatePlatformUI() {
    const platform = PLATFORMS[selectedPlatform];
    if (!platform) return;

    // Update handle input label and help text
    handleLabel.textContent = platform.handleLabel;
    handleHelp.textContent = platform.handleHelp;

    // Update handle value from stored handles
    const handle = connectedHandles[selectedPlatform];
    handleInput.value = handle || '';
    handleInput.style.color = handle ? '#00ff88' : '';

    // Update import button state
    if (!platform.supportsBulkImport) {
      startImportBtn.disabled = true;
      startImportBtn.textContent = 'Coming Soon';
    } else {
      startImportBtn.disabled = false;
      startImportBtn.textContent = 'Start Import';
    }

    if (fullModeBtn) {
      const supportsFullImport = Boolean(platform.supportsFullImport);
      fullModeBtn.disabled = !supportsFullImport;
      fullModeBtn.title = supportsFullImport
        ? ''
        : `Full import is not available for ${platform.name} yet`;

      if (!supportsFullImport && selectedMode === 'full') {
        modeBtns.forEach((b) => b.classList.remove('active'));
        if (quickModeBtn) {
          quickModeBtn.classList.add('active');
        }
        applyModeSelection('quick');
      }
    }
  }

  // ============================================================
  // TOKEN VISIBILITY TOGGLE
  // ============================================================

  let tokenVisible = false;
  toggleTokenBtn.addEventListener('click', () => {
    tokenVisible = !tokenVisible;
    extensionTokenInput.type = tokenVisible ? 'text' : 'password';
    toggleTokenBtn.textContent = tokenVisible ? 'Hide' : 'Show';
  });

  // ============================================================
  // MODE TOGGLE
  // ============================================================

  function applyModeSelection(mode) {
    selectedMode = mode;
    const isQuickMode = selectedMode === 'quick';
    const platformName = PLATFORMS[selectedPlatform]?.name || 'This platform';

    if (isQuickMode) {
      modeDescription.textContent =
        'Quick: Imports submission metadata only (fast).';
      verdictFilterSelect.value = 'all';
      verdictFilterSelect.disabled = true;
      verdictFilterSelect.title = 'Quick mode always imports all verdicts.';
    } else {
      if (selectedPlatform === 'codeforces') {
        modeDescription.textContent =
          'Full: Extracts code/details before sync (slower, opens tabs).';
      } else {
        modeDescription.textContent = `Full: Runs deep import for ${platformName} with filtered verdict support.`;
      }
      verdictFilterSelect.disabled = false;
      verdictFilterSelect.title = '';
    }

    resetImportUI();
    updateResultLabels();
  }

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (
        btn.dataset.mode === 'full' &&
        !PLATFORMS[selectedPlatform]?.supportsFullImport
      ) {
        showStatus(
          importStatus,
          `Full import is not available for ${PLATFORMS[selectedPlatform].name} yet. Use Quick Import.`,
          'warning'
        );
        return;
      }

      modeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      applyModeSelection(btn.dataset.mode);
    });
  });

  verdictFilterSelect.addEventListener('change', () => {
    updateResultLabels();
  });

  // Initialize mode-specific UI state.
  applyModeSelection(selectedMode);

  // ============================================================
  // SAVE SETTINGS
  // ============================================================

  saveSettingsBtn.addEventListener('click', () => {
    const tokenValue = extensionTokenInput.value.trim();

    console.log('[NEUPC] Saving settings...');
    console.log(
      '[NEUPC] Token to save:',
      tokenValue ? tokenValue.substring(0, 20) + '...' : 'empty'
    );

    const settings = {
      autoSyncEnabled: autoSyncEnabled.checked,
      apiEndpoint: apiEndpointSelect.value,
      extensionToken: tokenValue,
    };

    browserAPI.storage.sync.set(settings, () => {
      console.log('[NEUPC] Settings saved to storage');

      // Verify save worked
      browserAPI.storage.sync.get(['extensionToken'], (result) => {
        console.log(
          '[NEUPC] Verified saved token:',
          result.extensionToken
            ? result.extensionToken.substring(0, 20) + '...'
            : 'empty'
        );
      });

      showStatus(settingsStatus, 'Settings saved!', 'success');

      // Auto-fetch handles if token is provided
      if (settings.extensionToken) {
        fetchUserHandles(settings.apiEndpoint, settings.extensionToken);
      }
    });
  });

  // ============================================================
  // LOAD SETTINGS
  // ============================================================

  function loadSettings() {
    browserAPI.storage.sync.get(
      ['autoSyncEnabled', 'apiEndpoint', 'extensionToken', 'connectedHandles'],
      (result) => {
        autoSyncEnabled.checked = result.autoSyncEnabled || false;
        apiEndpointSelect.value = result.apiEndpoint || 'http://localhost:3000';
        extensionTokenInput.value = result.extensionToken || '';

        // Load cached handles
        if (result.connectedHandles) {
          connectedHandles = result.connectedHandles;
          updateConnectedHandlesUI();
          updatePlatformUI();
        }

        // Fetch fresh handles from NEUPC if token is available
        if (result.extensionToken) {
          fetchUserHandles(result.apiEndpoint, result.extensionToken);
        } else {
          updateConnectedHandlesUI();
        }
      }
    );
  }

  // ============================================================
  // FETCH USER HANDLES FROM NEUPC
  // ============================================================

  async function fetchUserHandles(apiEndpoint, token) {
    try {
      const apiUrl = (apiEndpoint || 'http://localhost:3000').replace(
        /\/+$/,
        ''
      );

      console.log(
        '[NEUPC] Fetching user handles from:',
        `${apiUrl}/api/problem-solving/sync-status`
      );

      const response = await fetch(
        `${apiUrl}/api/problem-solving/sync-status`,
        {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('[NEUPC] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(
          '[NEUPC] Failed to fetch user handles:',
          response.status,
          response.statusText,
          errorText
        );
        updateConnectedHandlesUI();
        return;
      }

      const data = await response.json();
      console.log('[NEUPC] Sync status response:', data);

      if (data.success && data.data?.syncStatus?.platforms) {
        // Parse all platform handles
        connectedHandles = {};
        for (const platform of data.data.syncStatus.platforms) {
          if (platform.handle) {
            connectedHandles[platform.platform] = platform.handle;
          }
        }

        // Save to storage
        browserAPI.storage.sync.set({ connectedHandles });

        console.log('[NEUPC] Connected handles:', connectedHandles);
      }

      updateConnectedHandlesUI();
      updatePlatformUI();
    } catch (error) {
      console.error('[NEUPC] Error fetching user handles:', error);
      updateConnectedHandlesUI();
    }
  }

  // ============================================================
  // UPDATE CONNECTED HANDLES UI
  // ============================================================

  function updateConnectedHandlesUI() {
    const platformsToShow = ['codeforces', 'atcoder', 'leetcode', 'toph'];
    let html = '';

    for (const platformId of platformsToShow) {
      const platform = PLATFORMS[platformId];
      const handle = connectedHandles[platformId];

      html += `
        <div class="handle-item">
          <span class="handle-platform">${platform.shortName}</span>
          <span class="handle-name">${handle || 'Not connected'}</span>
          <span class="handle-status ${handle ? '' : 'not-connected'}">
            ${handle ? 'Connected' : 'Not set'}
          </span>
        </div>
      `;
    }

    connectedHandlesEl.innerHTML = html;
  }

  // ============================================================
  // REFRESH HANDLE BUTTON
  // ============================================================

  refreshHandleBtn.addEventListener('click', async () => {
    console.log('[NEUPC] Refresh handle button clicked');

    const settings = await new Promise((resolve) => {
      browserAPI.storage.sync.get(['apiEndpoint', 'extensionToken'], resolve);
    });

    const token = settings.extensionToken;
    const endpoint = settings.apiEndpoint || 'http://localhost:3000';

    if (!token) {
      showStatus(
        importStatus,
        'Please configure Extension Token in Settings first',
        'warning'
      );
      // Switch to settings tab
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));
      document.querySelector('[data-tab="settings"]').classList.add('active');
      document.getElementById('tab-settings').classList.add('active');
      return;
    }

    // Disable button and show loading
    refreshHandleBtn.disabled = true;
    refreshHandleBtn.textContent = '...';

    try {
      await fetchUserHandles(endpoint, token);
      showStatus(importStatus, 'Handles refreshed!', 'success');
    } catch (error) {
      showStatus(importStatus, 'Failed to refresh handles', 'error');
    } finally {
      refreshHandleBtn.disabled = false;
      refreshHandleBtn.textContent = 'Refresh';
    }
  });

  // ============================================================
  // AUTO-SYNC TOGGLE
  // ============================================================

  autoSyncEnabled.addEventListener('change', () => {
    browserAPI.storage.sync.set({ autoSyncEnabled: autoSyncEnabled.checked });
    showStatus(
      settingsStatus,
      autoSyncEnabled.checked ? 'Auto-sync enabled!' : 'Auto-sync disabled',
      'success'
    );
  });

  // ============================================================
  // TEST CONNECTION
  // ============================================================

  testConnectionBtn.addEventListener('click', async () => {
    const token = extensionTokenInput.value.trim();
    const endpoint = apiEndpointSelect.value;

    if (!token) {
      showStatus(settingsStatus, 'Please enter an extension token', 'warning');
      return;
    }

    testConnectionBtn.disabled = true;
    testConnectionBtn.innerHTML = '<span class="spinner"></span>Testing...';

    browserAPI.runtime.sendMessage(
      { action: 'testConnection', apiUrl: endpoint, token },
      (response) => {
        testConnectionBtn.disabled = false;
        testConnectionBtn.textContent = 'Test Connection';

        if (response && response.success) {
          showStatus(settingsStatus, 'Connected successfully!', 'success');
          // Fetch handles after successful connection
          fetchUserHandles(endpoint, token);
        } else {
          showStatus(
            settingsStatus,
            `Failed: ${response?.error || 'Unknown error'}`,
            'error'
          );
        }
      }
    );
  });

  // ============================================================
  // IMPORT - START
  // ============================================================

  startImportBtn.addEventListener('click', async () => {
    if (
      selectedMode === 'full' &&
      !PLATFORMS[selectedPlatform]?.supportsFullImport
    ) {
      showStatus(
        importStatus,
        `Full import is not available for ${PLATFORMS[selectedPlatform].name} yet. Use Quick Import.`,
        'warning'
      );
      return;
    }

    const rawHandle =
      handleInput.value.trim() || connectedHandles[selectedPlatform];
    const handle =
      selectedPlatform === 'leetcode'
        ? normalizeLeetCodeHandle(rawHandle)
        : rawHandle;

    if (!handle) {
      showStatus(
        importStatus,
        `Please connect your ${PLATFORMS[selectedPlatform].name} handle in NEUPC`,
        'warning'
      );
      return;
    }

    // Check for token
    const settings = await new Promise((resolve) => {
      browserAPI.storage.sync.get(['extensionToken'], resolve);
    });

    if (!settings.extensionToken) {
      showStatus(
        importStatus,
        'Please configure your extension token in Settings',
        'warning'
      );
      // Switch to settings tab
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));
      document.querySelector('[data-tab="settings"]').classList.add('active');
      document.getElementById('tab-settings').classList.add('active');
      return;
    }

    // Get verdict filter selection
    const verdictFilter = verdictFilterSelect.value;

    // Reset UI
    hideStatus(importStatus);
    resultsSection.classList.add('hidden');
    progressSection.classList.remove('hidden');
    stopImportBtn.classList.remove('hidden');
    startImportBtn.disabled = true;
    startImportBtn.innerHTML = '<span class="spinner"></span>Importing...';

    // Reset progress indicators
    progressFill.style.width = '0%';
    progressText.textContent = 'Starting...';
    phase1.className = 'phase-dot';
    phase2.className = 'phase-dot';
    phase3.className = 'phase-dot';

    // Determine import action based on mode
    const action =
      selectedMode === 'quick' ? 'startQuickImport' : 'startFullImport';

    const isQuickMode = selectedMode === 'quick';

    browserAPI.runtime.sendMessage(
      {
        action,
        platform: selectedPlatform,
        handle,
        options: {
          fetchCodes: !isQuickMode,
          onlyAC: isQuickMode ? false : verdictFilter === 'ac',
          verdictFilter: isQuickMode ? 'all' : verdictFilter,
          syncEverything: true,
        },
      },
      (response) => {
        // Final response when import is complete
        startImportBtn.disabled = false;
        startImportBtn.textContent = 'Start Import';
        stopImportBtn.classList.add('hidden');

        if (response && response.success) {
          const data = response.data || {};

          if (data.stopped) {
            showStatus(
              importStatus,
              'Import stopped. Checkpoint saved for resume.',
              'warning'
            );
            progressText.textContent =
              'Import stopped. Starting again will resume from the last completed page.';
            return;
          }

          totalFoundEl.textContent = data.totalSubmissions || 0;
          acFoundEl.textContent = data.acSubmissions || 0;
          importedEl.textContent =
            data.submissionsRecorded ||
            (data.submissionsCreated || 0) + (data.submissionsUpdated || 0) ||
            data.imported ||
            0;
          resultsSection.classList.remove('hidden');

          const submissionsRecorded =
            data.submissionsRecorded ||
            (data.submissionsCreated || 0) + (data.submissionsUpdated || 0);
          const imported = data.imported || 0;
          const validation = data.validation || null;
          let message = '';
          let messageType = 'success';

          if (submissionsRecorded > 0 && imported > 0) {
            message = `Recorded ${submissionsRecorded} submissions, solved ${imported} problems!`;
          } else if (submissionsRecorded > 0) {
            message = `Recorded ${submissionsRecorded} submissions!`;
          } else if (imported > 0) {
            message = `Imported ${imported} problems!`;
          } else {
            message = 'Import complete!';
          }

          if (validation?.firstExtraction) {
            message = `${message} ${validation.message}`;
            if (validation.status !== 'passed' || validation.likelyPartial) {
              messageType = 'warning';
            }
          }

          showStatus(importStatus, message, messageType);

          // Mark all phases complete
          phase1.className = 'phase-dot complete';
          phase2.className = 'phase-dot complete';
          phase3.className = 'phase-dot complete';
          progressFill.style.width = '100%';
        } else {
          showStatus(
            importStatus,
            `Error: ${response?.error || 'Unknown error'}`,
            'error'
          );
        }
      }
    );
  });

  // ============================================================
  // IMPORT - STOP
  // ============================================================

  stopImportBtn.addEventListener('click', () => {
    browserAPI.runtime.sendMessage({ action: 'stopImport' }, (response) => {
      if (response && response.success) {
        showStatus(importStatus, 'Import stopped', 'warning');
        startImportBtn.disabled = false;
        startImportBtn.textContent = 'Start Import';
        stopImportBtn.classList.add('hidden');
      }
    });
  });

  // ============================================================
  // LISTEN FOR PROGRESS UPDATES
  // ============================================================

  browserAPI.runtime.onMessage.addListener((request) => {
    if (request.action === 'importProgress') {
      updateProgress(request);
    }
  });

  function updateProgress(data) {
    const { phase, message, currentPage, totalPages, progress } = data;

    // Update progress text
    if (message) {
      progressText.textContent = message;
    }

    // Calculate progress based on page
    let progressPercent = 0;
    if (totalPages && currentPage) {
      progressPercent = Math.round((currentPage / totalPages) * 100);
    } else if (progress) {
      progressPercent = progress;
    }

    // Update phase indicators
    switch (phase) {
      case 'fetching_api':
        phase1.className = 'phase-dot active';
        progressFill.style.width = '5%';
        break;

      case 'validating_first_extract':
        phase1.className = 'phase-dot active';
        progressFill.style.width = '9%';
        break;

      case 'api_complete':
        phase1.className = 'phase-dot complete';
        progressFill.style.width = '10%';
        if (data.total) totalFoundEl.textContent = data.total;
        if (data.acCount) acFoundEl.textContent = data.acCount;
        resultsSection.classList.remove('hidden');
        break;

      case 'fetching_page':
        phase1.className = 'phase-dot complete';
        phase2.className = 'phase-dot active';
        progressFill.style.width = `${10 + progressPercent * 0.6}%`;
        break;

      case 'fetching_codes':
        phase1.className = 'phase-dot complete';
        phase2.className = 'phase-dot active';
        // Show item progress within page
        if (data.currentItem && data.totalItems) {
          const itemProgress = (data.currentItem / data.totalItems) * 100;
          const pageBase = 10 + ((currentPage - 1) / totalPages) * 60;
          const pageRange = 60 / totalPages;
          progressFill.style.width = `${pageBase + (itemProgress / 100) * pageRange}%`;
        } else {
          progressFill.style.width = `${10 + progressPercent * 0.6}%`;
        }
        break;

      case 'importing':
        phase1.className = 'phase-dot complete';
        phase2.className = 'phase-dot active';
        phase3.className = 'phase-dot active';
        progressFill.style.width = `${10 + progressPercent * 0.6}%`;
        break;

      case 'codes_complete':
        phase2.className = 'phase-dot complete';
        progressFill.style.width = '70%';
        break;

      case 'complete':
        phase1.className = 'phase-dot complete';
        phase2.className = 'phase-dot complete';
        phase3.className = 'phase-dot complete';
        progressFill.style.width = '100%';
        importedEl.textContent =
          data.submissionsRecorded ||
          (data.submissionsCreated || 0) + (data.submissionsUpdated || 0) ||
          data.imported ||
          0;

        // Build a detailed status message
        let statusParts = [];
        if (data.submissionsCreated > 0) {
          statusParts.push(`${data.submissionsCreated} new`);
        }
        if (data.submissionsUpdated > 0) {
          statusParts.push(`${data.submissionsUpdated} updated`);
        }
        if (data.codesSkipped > 0) {
          statusParts.push(`${data.codesSkipped} skipped`);
        }
        if (data.imported > 0) {
          statusParts.push(`${data.imported} problems solved`);
        }

        if (statusParts.length > 0) {
          progressText.textContent = statusParts.join(', ');
        } else if (data.codesFetched !== undefined) {
          progressText.textContent = `Fetched ${data.codesFetched} codes, imported ${data.imported} problems`;
        } else {
          progressText.textContent = 'Import complete!';
        }

        if (data.validation?.firstExtraction) {
          progressText.textContent = `${progressText.textContent} | ${data.validation.message}`;
        }

        // Re-enable button
        startImportBtn.disabled = false;
        startImportBtn.textContent = 'Start Import';
        stopImportBtn.classList.add('hidden');
        break;

      case 'error':
        showStatus(importStatus, message || 'An error occurred', 'error');
        startImportBtn.disabled = false;
        startImportBtn.textContent = 'Start Import';
        stopImportBtn.classList.add('hidden');
        break;

      case 'stopped':
        showStatus(importStatus, message || 'Import stopped', 'warning');
        startImportBtn.disabled = false;
        startImportBtn.textContent = 'Start Import';
        stopImportBtn.classList.add('hidden');
        break;
    }
  }

  // ============================================================
  // CHECK FOR EXISTING IMPORT ON POPUP OPEN
  // ============================================================

  function checkImportStatus() {
    browserAPI.runtime.sendMessage(
      { action: 'getImportStatus' },
      (response) => {
        if (response && response.success && response.state?.isRunning) {
          // Import is in progress, show progress UI
          progressSection.classList.remove('hidden');
          stopImportBtn.classList.remove('hidden');
          startImportBtn.disabled = true;
          startImportBtn.innerHTML =
            '<span class="spinner"></span>Importing...';

          // Update with current state
          updateProgress({
            phase: response.state.phase,
            message: `Import in progress...`,
            total: response.state.codesTotal,
            fetched: response.state.codesFetched,
          });
        }
      }
    );
  }

  // ============================================================
  // INITIALIZE
  // ============================================================

  loadSettings();
  checkImportStatus();
  autoDetectPlatform();
  updateResultLabels();
});
