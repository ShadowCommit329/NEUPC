/**
 * @file Community Solutions Hook
 * @description Hook to fetch and manage community solutions for a problem
 */

import { useState, useEffect, useCallback } from 'react';

export function useCommunitySolutions(problemId, platform) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);

  const fetchCommunity = useCallback(async () => {
    if (!problemId || !platform) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        problemId,
        platform,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(`/api/problem-solving/community?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch community solutions');
      }

      setData(result.data);
    } catch (err) {
      console.error('Error fetching community solutions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [problemId, platform, limit, offset]);

  useEffect(() => {
    fetchCommunity();
  }, [fetchCommunity]);

  const loadMore = useCallback(() => {
    setOffset((prev) => prev + limit);
  }, [limit]);

  const refresh = useCallback(() => {
    setOffset(0);
    fetchCommunity();
  }, [fetchCommunity]);

  return {
    solutions: data?.members || [],
    stats: data?.stats
      ? {
          totalSolutions: data.stats.totalSolutions,
          totalMembers: data.stats.uniqueMembers,
          approachDistribution:
            data.stats.approaches?.reduce((acc, { name, count }) => {
              acc[name] = count;
              return acc;
            }, {}) || {},
        }
      : null,
    loading,
    error,
    loadMore,
    refresh,
    hasMore: data?.pagination?.hasMore || false,
  };
}
