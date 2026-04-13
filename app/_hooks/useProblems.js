/**
 * @file useProblems Hook
 * @module useProblems
 *
 * Custom hook for fetching and managing problems with solutions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export function useProblems(initialFilters = {}) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState({
    total: 0,
    platforms: [],
    tags: [],
  });
  const [filters, setFilters] = useState({
    search: '',
    platform: '',
    difficulty: '',
    tag: '',
    solvedDate: '',
    problemStatus: 'solved',
    hasCode: '',
    sortBy: 'date_desc',
    limit: 50,
    offset: 0,
    ...initialFilters,
  });

  const fetchProblems = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.platform) params.append('platform', filters.platform);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);
      if (filters.tag) params.append('tag', filters.tag);
      if (filters.solvedDate) params.append('solvedDate', filters.solvedDate);
      if (filters.problemStatus) {
        params.append('problemStatus', filters.problemStatus);
      }
      if (filters.search) params.append('search', filters.search);
      if (filters.hasCode) params.append('hasCode', filters.hasCode);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`/api/problem-solving/problems?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch problems');
      }

      const data = await response.json();
      setProblems(data.problems || []);
      setMetadata(data.metadata || { total: 0, platforms: [], tags: [] });
      setError(null);
    } catch (err) {
      setError(err.message);
      setProblems([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, offset: 0 })); // Reset offset on filter change
  }, []);

  const nextPage = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      offset: prev.offset + prev.limit,
    }));
  }, []);

  const prevPage = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      offset: Math.max(0, prev.offset - prev.limit),
    }));
  }, []);

  const refetch = useCallback(() => {
    fetchProblems();
  }, [fetchProblems]);

  return {
    problems,
    loading,
    error,
    metadata,
    filters,
    updateFilters,
    nextPage,
    prevPage,
    refetch,
  };
}

export function useSolution() {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const uploadSolution = useCallback(async (formData) => {
    setUploading(true);
    try {
      const response = await fetch('/api/problem-solving/solutions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload solution');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const deleteSolution = useCallback(async (problemId, platform) => {
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/problem-solving/solutions?problemId=${problemId}&platform=${platform}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete solution');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      throw err;
    } finally {
      setDeleting(false);
    }
  }, []);

  const getSolution = useCallback(async (problemId, platform) => {
    try {
      const response = await fetch(
        `/api/problem-solving/solutions?problemId=${problemId}&platform=${platform}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch solution');
      }

      const result = await response.json();
      return result.solution;
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    uploadSolution,
    deleteSolution,
    getSolution,
    uploading,
    deleting,
  };
}
