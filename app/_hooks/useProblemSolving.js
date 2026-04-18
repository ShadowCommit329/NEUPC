/**
 * @file Problem Solving Hooks
 * @module useProblemSolving
 *
 * Custom hooks for problem solving tracking
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getProblemSolvingData,
  getMemberProblemSolvingData,
  fullSyncAction,
  syncPlatformAction,
  syncContestHistoryAction,
  getLeaderboardAction,
  connectHandleAction,
  disconnectHandleAction,
  cleanupLeetCodeDataAction,
} from '@/app/_lib/problem-solving-actions';

/**
 * Hook for fetching current user's problem solving data
 */
export function useProblemSolving() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncingPlatform, setSyncingPlatform] = useState(null);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async (options = {}) => {
    const { background = false } = options;

    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      if (!background) {
        setLoading(true);
      }

      const result = await getProblemSolvingData();

      if (!result.success) {
        throw new Error(
          result.error || 'Failed to fetch data. Please try again.'
        );
      }

      setData(result.data);
      setError(null);
    } catch (err) {
      if (!background) {
        setError(err.message);
      } else {
        console.warn('[useProblemSolving] Background refresh failed:', err);
      }
    } finally {
      if (!background) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, []);

  const syncData = useCallback(
    async (forceFullSync = false) => {
      try {
        setSyncing(true);
        const result = await fullSyncAction(forceFullSync);

        if (!result.success) {
          throw new Error(result.error || 'Failed to sync');
        }

        await fetchData();
        return result.data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setSyncing(false);
      }
    },
    [fetchData]
  );

  const syncPlatform = useCallback(
    async (platform, forceFullSync = false, manualHtml = null) => {
      try {
        setSyncingPlatform(platform);
        const result = await syncPlatformAction(
          platform,
          forceFullSync,
          manualHtml
        );

        if (!result.success) {
          throw new Error(result.error || `Failed to sync ${platform}`);
        }

        await fetchData();
        return result.data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setSyncingPlatform(null);
      }
    },
    [fetchData]
  );

  const syncContestHistory = useCallback(
    async (forceUpdate = true) => {
      try {
        setSyncing(true);
        const result = await syncContestHistoryAction(forceUpdate);

        if (!result.success) {
          throw new Error(result.error || 'Failed to sync contest history');
        }

        await fetchData();
        return result.data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setSyncing(false);
      }
    },
    [fetchData]
  );

  const cleanupLeetCodeData = useCallback(async () => {
    try {
      setSyncing(true);
      const result = await cleanupLeetCodeDataAction();

      if (!result.success) {
        throw new Error(result.error || 'Failed to clean LeetCode data');
      }

      await fetchData();
      return result.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const refreshInBackground = () => fetchData({ background: true });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshInBackground();
      }
    };

    window.addEventListener('focus', refreshInBackground);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Keep dashboard stats fresh when extraction completes externally
    // (browser extension/API import) while this page is already open.
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshInBackground();
      }
    }, 20000);

    return () => {
      window.removeEventListener('focus', refreshInBackground);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    syncing,
    syncingPlatform,
    refetch: fetchData,
    sync: syncData,
    syncPlatform,
    syncContestHistory,
    cleanupLeetCodeData,
  };
}

/**
 * Hook for leaderboard data
 */
export function useLeaderboard(type = 'global', limit = 50) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getLeaderboardAction(type, limit);

      if (!result.success) {
        throw new Error(
          result.error || 'Failed to fetch leaderboard. Please try again.'
        );
      }

      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [type, limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { data, loading, error, refetch: fetchLeaderboard };
}

/**
 * Hook for user profile data
 */
export function useUserProfile(userId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const result = await getMemberProblemSolvingData(userId);

        if (!result.success) {
          throw new Error(
            result.error || 'Failed to fetch profile. Please try again.'
          );
        }

        setData(result.data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  return { data, loading, error };
}

/**
 * Hook for connecting handles
 */
export function useConnectHandle() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async (platform, handle) => {
    try {
      setLoading(true);
      setError(null);

      const result = await connectHandleAction(platform, handle);

      if (!result.success) {
        throw new Error(result.error || 'Failed to connect handle');
      }

      return result.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async (platform) => {
    try {
      setLoading(true);
      setError(null);

      const result = await disconnectHandleAction(platform);

      if (!result.success) {
        throw new Error(result.error || 'Failed to disconnect handle');
      }

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { connect, disconnect, loading, error };
}
