/**
 * NEUPC Browser Extension - Storage Module
 * Unified storage management with caching and sync capabilities
 */

import { STORAGE_KEYS, DEFAULT_SETTINGS } from './constants.js';
import { log, logError, browserAPI } from './utils.js';

// ============================================================
// CORE STORAGE OPERATIONS
// ============================================================

/**
 * Get item from Chrome storage
 * @param {string|string[]} keys - Storage key(s)
 * @param {string} storageType - 'local' or 'sync'
 * @returns {Promise<Object>}
 */
export async function getStorage(keys, storageType = 'local') {
  try {
    const storage =
      storageType === 'sync'
        ? browserAPI.storage.sync
        : browserAPI.storage.local;
    return await storage.get(keys);
  } catch (error) {
    logError('Storage', `Failed to get ${keys}:`, error);
    return {};
  }
}

/**
 * Set item in Chrome storage
 * @param {Object} items - Items to store
 * @param {string} storageType - 'local' or 'sync'
 * @returns {Promise<void>}
 */
export async function setStorage(items, storageType = 'local') {
  try {
    const storage =
      storageType === 'sync'
        ? browserAPI.storage.sync
        : browserAPI.storage.local;
    await storage.set(items);
    log('Storage', 'Saved:', Object.keys(items));
  } catch (error) {
    logError('Storage', 'Failed to save:', error);
    throw error;
  }
}

/**
 * Remove item from Chrome storage
 * @param {string|string[]} keys - Storage key(s)
 * @param {string} storageType - 'local' or 'sync'
 * @returns {Promise<void>}
 */
export async function removeStorage(keys, storageType = 'local') {
  try {
    const storage =
      storageType === 'sync'
        ? browserAPI.storage.sync
        : browserAPI.storage.local;
    await storage.remove(keys);
    log('Storage', 'Removed:', keys);
  } catch (error) {
    logError('Storage', 'Failed to remove:', error);
    throw error;
  }
}

/**
 * Clear all storage
 * @param {string} storageType - 'local' or 'sync'
 * @returns {Promise<void>}
 */
export async function clearStorage(storageType = 'local') {
  try {
    const storage =
      storageType === 'sync'
        ? browserAPI.storage.sync
        : browserAPI.storage.local;
    await storage.clear();
    log('Storage', 'Cleared all storage');
  } catch (error) {
    logError('Storage', 'Failed to clear storage:', error);
    throw error;
  }
}

// ============================================================
// SETTINGS MANAGEMENT
// ============================================================

/**
 * Get settings with defaults
 * @returns {Promise<Object>}
 */
export async function getSettings() {
  try {
    const result = await getStorage(STORAGE_KEYS.SETTINGS, 'sync');
    return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
  } catch (error) {
    logError('Storage', 'Failed to get settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update settings
 * @param {Object} updates - Settings to update
 * @returns {Promise<void>}
 */
export async function updateSettings(updates) {
  try {
    const currentSettings = await getSettings();
    const newSettings = { ...currentSettings, ...updates };
    await setStorage({ [STORAGE_KEYS.SETTINGS]: newSettings }, 'sync');
    log('Storage', 'Settings updated:', Object.keys(updates));
  } catch (error) {
    logError('Storage', 'Failed to update settings:', error);
    throw error;
  }
}

/**
 * Reset settings to defaults
 * @returns {Promise<void>}
 */
export async function resetSettings() {
  try {
    await setStorage({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS }, 'sync');
    log('Storage', 'Settings reset to defaults');
  } catch (error) {
    logError('Storage', 'Failed to reset settings:', error);
    throw error;
  }
}

// ============================================================
// AUTHENTICATION
// ============================================================

/**
 * Get extension token
 * @returns {Promise<string|null>}
 */
export async function getExtensionToken() {
  try {
    const result = await getStorage(STORAGE_KEYS.EXTENSION_TOKEN, 'sync');
    return result[STORAGE_KEYS.EXTENSION_TOKEN] || null;
  } catch (error) {
    logError('Storage', 'Failed to get extension token:', error);
    return null;
  }
}

/**
 * Set extension token
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function setExtensionToken(token) {
  try {
    await setStorage({ [STORAGE_KEYS.EXTENSION_TOKEN]: token }, 'sync');
    log('Storage', 'Extension token saved');
  } catch (error) {
    logError('Storage', 'Failed to save extension token:', error);
    throw error;
  }
}

/**
 * Clear extension token
 * @returns {Promise<void>}
 */
export async function clearExtensionToken() {
  try {
    await removeStorage(STORAGE_KEYS.EXTENSION_TOKEN, 'sync');
    log('Storage', 'Extension token cleared');
  } catch (error) {
    logError('Storage', 'Failed to clear extension token:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const token = await getExtensionToken();
  return !!token;
}

// ============================================================
// API URL MANAGEMENT
// ============================================================

/**
 * Get API URL
 * @returns {Promise<string>}
 */
export async function getApiUrl() {
  try {
    const settings = await getSettings();
    return settings.apiUrl || DEFAULT_SETTINGS.apiUrl;
  } catch (error) {
    logError('Storage', 'Failed to get API URL:', error);
    return DEFAULT_SETTINGS.apiUrl;
  }
}

/**
 * Set API URL
 * @param {string} url
 * @returns {Promise<void>}
 */
export async function setApiUrl(url) {
  await updateSettings({ apiUrl: url });
}

// ============================================================
// USER DATA
// ============================================================

/**
 * Get user data
 * @returns {Promise<Object|null>}
 */
export async function getUserData() {
  try {
    const result = await getStorage(STORAGE_KEYS.USER_DATA);
    return result[STORAGE_KEYS.USER_DATA] || null;
  } catch (error) {
    logError('Storage', 'Failed to get user data:', error);
    return null;
  }
}

/**
 * Set user data
 * @param {Object} userData
 * @returns {Promise<void>}
 */
export async function setUserData(userData) {
  try {
    await setStorage({ [STORAGE_KEYS.USER_DATA]: userData });
    log('Storage', 'User data saved');
  } catch (error) {
    logError('Storage', 'Failed to save user data:', error);
    throw error;
  }
}

/**
 * Clear user data
 * @returns {Promise<void>}
 */
export async function clearUserData() {
  try {
    await removeStorage(STORAGE_KEYS.USER_DATA);
    log('Storage', 'User data cleared');
  } catch (error) {
    logError('Storage', 'Failed to clear user data:', error);
    throw error;
  }
}

// ============================================================
// CONNECTED HANDLES
// ============================================================

/**
 * Get all connected handles
 * @returns {Promise<Object>} - Map of platform -> handle
 */
export async function getConnectedHandles() {
  try {
    const result = await getStorage(STORAGE_KEYS.CONNECTED_HANDLES, 'sync');
    return result[STORAGE_KEYS.CONNECTED_HANDLES] || {};
  } catch (error) {
    logError('Storage', 'Failed to get connected handles:', error);
    return {};
  }
}

/**
 * Get handle for a specific platform
 * @param {string} platform - Platform ID
 * @returns {Promise<string|null>}
 */
export async function getHandle(platform) {
  const handles = await getConnectedHandles();
  return handles[platform] || null;
}

/**
 * Set handle for a platform
 * @param {string} platform - Platform ID
 * @param {string} handle - User handle
 * @returns {Promise<void>}
 */
export async function setHandle(platform, handle) {
  try {
    const handles = await getConnectedHandles();
    handles[platform] = handle;
    await setStorage({ [STORAGE_KEYS.CONNECTED_HANDLES]: handles }, 'sync');
    log('Storage', `Handle set for ${platform}: ${handle}`);
  } catch (error) {
    logError('Storage', 'Failed to set handle:', error);
    throw error;
  }
}

/**
 * Remove handle for a platform
 * @param {string} platform - Platform ID
 * @returns {Promise<void>}
 */
export async function removeHandle(platform) {
  try {
    const handles = await getConnectedHandles();
    delete handles[platform];
    await setStorage({ [STORAGE_KEYS.CONNECTED_HANDLES]: handles }, 'sync');
    log('Storage', `Handle removed for ${platform}`);
  } catch (error) {
    logError('Storage', 'Failed to remove handle:', error);
    throw error;
  }
}

/**
 * Set multiple handles at once
 * @param {Object} handles - Map of platform -> handle
 * @returns {Promise<void>}
 */
export async function setHandles(handles) {
  try {
    const currentHandles = await getConnectedHandles();
    const newHandles = { ...currentHandles, ...handles };
    await setStorage({ [STORAGE_KEYS.CONNECTED_HANDLES]: newHandles }, 'sync');
    log('Storage', 'Handles updated:', Object.keys(handles));
  } catch (error) {
    logError('Storage', 'Failed to set handles:', error);
    throw error;
  }
}

// ============================================================
// SYNC STATE
// ============================================================

/**
 * Get last sync timestamp for a platform
 * @param {string} platform - Platform identifier
 * @returns {Promise<string|null>} - ISO 8601 timestamp
 */
export async function getLastSync(platform) {
  try {
    const result = await getStorage(STORAGE_KEYS.LAST_SYNC);
    const lastSync = result[STORAGE_KEYS.LAST_SYNC] || {};
    return lastSync[platform] || null;
  } catch (error) {
    logError('Storage', 'Failed to get last sync:', error);
    return null;
  }
}

/**
 * Update last sync timestamp for a platform
 * @param {string} platform - Platform identifier
 * @param {string} timestamp - ISO 8601 timestamp (defaults to now)
 * @returns {Promise<void>}
 */
export async function updateLastSync(platform, timestamp = null) {
  try {
    const result = await getStorage(STORAGE_KEYS.LAST_SYNC);
    const lastSync = result[STORAGE_KEYS.LAST_SYNC] || {};
    lastSync[platform] = timestamp || new Date().toISOString();
    await setStorage({ [STORAGE_KEYS.LAST_SYNC]: lastSync });
    log('Storage', `Updated last sync for ${platform}`);
  } catch (error) {
    logError('Storage', 'Failed to update last sync:', error);
    throw error;
  }
}

/**
 * Get sync statistics
 * @returns {Promise<Object>}
 */
export async function getSyncStats() {
  try {
    const result = await getStorage(STORAGE_KEYS.SYNC_STATS);
    return (
      result[STORAGE_KEYS.SYNC_STATS] || {
        totalSynced: 0,
        lastSyncTime: null,
        platformStats: {},
        sessionStats: {
          submitted: 0,
          failed: 0,
          skipped: 0,
        },
      }
    );
  } catch (error) {
    logError('Storage', 'Failed to get sync stats:', error);
    return {
      totalSynced: 0,
      lastSyncTime: null,
      platformStats: {},
      sessionStats: { submitted: 0, failed: 0, skipped: 0 },
    };
  }
}

/**
 * Update sync statistics
 * @param {string} platform - Platform identifier
 * @param {number} count - Number of submissions synced
 * @param {boolean} success - Whether sync was successful
 * @returns {Promise<void>}
 */
export async function updateSyncStats(platform, count, success = true) {
  try {
    const stats = await getSyncStats();

    if (success) {
      stats.totalSynced += count;
      stats.sessionStats.submitted += count;
    } else {
      stats.sessionStats.failed += count;
    }

    stats.lastSyncTime = new Date().toISOString();

    if (!stats.platformStats[platform]) {
      stats.platformStats[platform] = { count: 0, lastSync: null, failed: 0 };
    }

    if (success) {
      stats.platformStats[platform].count += count;
      stats.platformStats[platform].lastSync = new Date().toISOString();
    } else {
      stats.platformStats[platform].failed += count;
    }

    await setStorage({ [STORAGE_KEYS.SYNC_STATS]: stats });
    log(
      'Storage',
      `Updated sync stats for ${platform}: ${success ? '+' : '-'}${count}`
    );
  } catch (error) {
    logError('Storage', 'Failed to update sync stats:', error);
    throw error;
  }
}

/**
 * Reset session stats (call at extension startup)
 * @returns {Promise<void>}
 */
export async function resetSessionStats() {
  try {
    const stats = await getSyncStats();
    stats.sessionStats = { submitted: 0, failed: 0, skipped: 0 };
    await setStorage({ [STORAGE_KEYS.SYNC_STATS]: stats });
    log('Storage', 'Session stats reset');
  } catch (error) {
    logError('Storage', 'Failed to reset session stats:', error);
  }
}

// ============================================================
// SUBMISSION CACHE
// ============================================================

/**
 * Get cached submissions for a platform
 * @param {string} platform - Platform identifier
 * @returns {Promise<Object[]>}
 */
export async function getCachedSubmissions(platform) {
  try {
    const result = await getStorage(STORAGE_KEYS.CACHED_SUBMISSIONS);
    const cached = result[STORAGE_KEYS.CACHED_SUBMISSIONS] || {};
    return cached[platform] || [];
  } catch (error) {
    logError('Storage', 'Failed to get cached submissions:', error);
    return [];
  }
}

/**
 * Get all cached submissions
 * @returns {Promise<Object>} - Map of platform -> submissions[]
 */
export async function getAllCachedSubmissions() {
  try {
    const result = await getStorage(STORAGE_KEYS.CACHED_SUBMISSIONS);
    return result[STORAGE_KEYS.CACHED_SUBMISSIONS] || {};
  } catch (error) {
    logError('Storage', 'Failed to get all cached submissions:', error);
    return {};
  }
}

/**
 * Cache submissions for a platform
 * @param {string} platform - Platform identifier
 * @param {Object[]} submissions - Submissions to cache
 * @returns {Promise<void>}
 */
export async function cacheSubmissions(platform, submissions) {
  try {
    const result = await getStorage(STORAGE_KEYS.CACHED_SUBMISSIONS);
    const cached = result[STORAGE_KEYS.CACHED_SUBMISSIONS] || {};
    cached[platform] = submissions;
    await setStorage({ [STORAGE_KEYS.CACHED_SUBMISSIONS]: cached });
    log('Storage', `Cached ${submissions.length} submissions for ${platform}`);
  } catch (error) {
    logError('Storage', 'Failed to cache submissions:', error);
    throw error;
  }
}

/**
 * Add submission to cache
 * @param {string} platform - Platform identifier
 * @param {Object} submission - Submission to add
 * @returns {Promise<void>}
 */
export async function addCachedSubmission(platform, submission) {
  try {
    const cached = await getCachedSubmissions(platform);

    // Check if submission already exists
    const exists = cached.some(
      (s) => s.submissionId === submission.submissionId
    );

    if (!exists) {
      cached.unshift(submission);
      await cacheSubmissions(platform, cached);
    }
  } catch (error) {
    logError('Storage', 'Failed to add cached submission:', error);
    throw error;
  }
}

/**
 * Check if submission is cached
 * @param {string} platform - Platform identifier
 * @param {string} submissionId - Submission ID
 * @returns {Promise<boolean>}
 */
export async function isSubmissionCached(platform, submissionId) {
  try {
    const cached = await getCachedSubmissions(platform);
    return cached.some((s) => s.submissionId === submissionId);
  } catch (error) {
    logError('Storage', 'Failed to check submission cache:', error);
    return false;
  }
}

/**
 * Clear cached submissions for a platform
 * @param {string} platform - Platform identifier (optional, clears all if not provided)
 * @returns {Promise<void>}
 */
export async function clearCachedSubmissions(platform = null) {
  try {
    if (platform) {
      const result = await getStorage(STORAGE_KEYS.CACHED_SUBMISSIONS);
      const cached = result[STORAGE_KEYS.CACHED_SUBMISSIONS] || {};
      delete cached[platform];
      await setStorage({ [STORAGE_KEYS.CACHED_SUBMISSIONS]: cached });
      log('Storage', `Cleared cached submissions for ${platform}`);
    } else {
      await setStorage({ [STORAGE_KEYS.CACHED_SUBMISSIONS]: {} });
      log('Storage', 'Cleared all cached submissions');
    }
  } catch (error) {
    logError('Storage', 'Failed to clear cached submissions:', error);
    throw error;
  }
}

// ============================================================
// SYNC QUEUE
// ============================================================

/**
 * Get sync queue
 * @returns {Promise<Object[]>}
 */
export async function getSyncQueue() {
  try {
    const result = await getStorage(STORAGE_KEYS.SYNC_QUEUE);
    return result[STORAGE_KEYS.SYNC_QUEUE] || [];
  } catch (error) {
    logError('Storage', 'Failed to get sync queue:', error);
    return [];
  }
}

/**
 * Add item to sync queue
 * @param {Object} item - Item to queue
 * @returns {Promise<void>}
 */
export async function addToSyncQueue(item) {
  try {
    const queue = await getSyncQueue();
    queue.push({
      ...item,
      queuedAt: new Date().toISOString(),
      attempts: 0,
    });
    await setStorage({ [STORAGE_KEYS.SYNC_QUEUE]: queue });
    log('Storage', 'Added item to sync queue');
  } catch (error) {
    logError('Storage', 'Failed to add to sync queue:', error);
    throw error;
  }
}

/**
 * Remove item from sync queue
 * @param {number} index - Index of item to remove
 * @returns {Promise<void>}
 */
export async function removeFromSyncQueue(index) {
  try {
    const queue = await getSyncQueue();
    if (index >= 0 && index < queue.length) {
      queue.splice(index, 1);
      await setStorage({ [STORAGE_KEYS.SYNC_QUEUE]: queue });
      log('Storage', 'Removed item from sync queue');
    }
  } catch (error) {
    logError('Storage', 'Failed to remove from sync queue:', error);
    throw error;
  }
}

/**
 * Clear sync queue
 * @returns {Promise<void>}
 */
export async function clearSyncQueue() {
  try {
    await setStorage({ [STORAGE_KEYS.SYNC_QUEUE]: [] });
    log('Storage', 'Sync queue cleared');
  } catch (error) {
    logError('Storage', 'Failed to clear sync queue:', error);
    throw error;
  }
}

/**
 * Update queue item (e.g., increment attempts)
 * @param {number} index - Index of item
 * @param {Object} updates - Updates to apply
 * @returns {Promise<void>}
 */
export async function updateQueueItem(index, updates) {
  try {
    const queue = await getSyncQueue();
    if (index >= 0 && index < queue.length) {
      queue[index] = { ...queue[index], ...updates };
      await setStorage({ [STORAGE_KEYS.SYNC_QUEUE]: queue });
    }
  } catch (error) {
    logError('Storage', 'Failed to update queue item:', error);
    throw error;
  }
}

// ============================================================
// SETTINGS HELPERS
// ============================================================

/**
 * Check if auto-sync is enabled
 * @returns {Promise<boolean>}
 */
export async function isAutoSyncEnabled() {
  try {
    const settings = await getSettings();
    return settings.autoSync && settings.syncEnabled;
  } catch (error) {
    logError('Storage', 'Failed to check auto-sync status:', error);
    return false;
  }
}

/**
 * Check if source code capture is enabled
 * @returns {Promise<boolean>}
 */
export async function isCaptureSourceCodeEnabled() {
  try {
    const settings = await getSettings();
    return settings.captureSourceCode !== false; // Default to true
  } catch (error) {
    logError('Storage', 'Failed to check source code capture status:', error);
    return true;
  }
}

/**
 * Check if notifications are enabled
 * @returns {Promise<boolean>}
 */
export async function isNotificationsEnabled() {
  try {
    const settings = await getSettings();
    return settings.showNotifications !== false; // Default to true
  } catch (error) {
    return true;
  }
}

// ============================================================
// STORAGE LISTENERS
// ============================================================

/**
 * Listen for storage changes
 * @param {Function} callback - Callback function (changes, areaName)
 * @returns {Function} - Unsubscribe function
 */
export function onStorageChanged(callback) {
  const listener = (changes, areaName) => {
    callback(changes, areaName);
  };

  browserAPI.storage.onChanged.addListener(listener);

  // Return unsubscribe function
  return () => {
    browserAPI.storage.onChanged.removeListener(listener);
  };
}

/**
 * Listen for specific key changes
 * @param {string} key - Storage key to watch
 * @param {Function} callback - Callback function (newValue, oldValue)
 * @returns {Function} - Unsubscribe function
 */
export function onKeyChanged(key, callback) {
  return onStorageChanged((changes) => {
    if (changes[key]) {
      callback(changes[key].newValue, changes[key].oldValue);
    }
  });
}

// ============================================================
// EXPORT ALL DATA
// ============================================================

/**
 * Export all extension data
 * @returns {Promise<Object>}
 */
export async function exportAllData() {
  try {
    const [localData, syncData] = await Promise.all([
      browserAPI.storage.local.get(null),
      browserAPI.storage.sync.get(null),
    ]);

    return {
      local: localData,
      sync: syncData,
      exportedAt: new Date().toISOString(),
      version: browserAPI.runtime.getManifest?.()?.version || 'unknown',
    };
  } catch (error) {
    logError('Storage', 'Failed to export data:', error);
    throw error;
  }
}

/**
 * Import extension data
 * @param {Object} data - Data to import
 * @returns {Promise<void>}
 */
export async function importData(data) {
  try {
    if (data.local) {
      await browserAPI.storage.local.set(data.local);
    }
    if (data.sync) {
      await browserAPI.storage.sync.set(data.sync);
    }
    log('Storage', 'Data imported successfully');
  } catch (error) {
    logError('Storage', 'Failed to import data:', error);
    throw error;
  }
}
