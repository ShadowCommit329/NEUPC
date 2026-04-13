/**
 * @file Platform Search Hook
 * @description Custom hook for searching and filtering platforms
 */

'use client';

import { useState, useMemo } from 'react';
import { PLATFORM_CATEGORIES } from './platformCategories';

export function usePlatformSearch(availablePlatforms, platformConfig) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter platforms based on search query
  const filteredPlatforms = useMemo(() => {
    if (!searchQuery.trim()) {
      return availablePlatforms;
    }

    const query = searchQuery.toLowerCase();
    return availablePlatforms.filter((platform) => {
      const config = platformConfig[platform.id];
      if (!config) return false;

      return (
        config.name.toLowerCase().includes(query) ||
        platform.id.toLowerCase().includes(query) ||
        config.short.toLowerCase().includes(query)
      );
    });
  }, [availablePlatforms, searchQuery, platformConfig]);

  // Group filtered platforms by category
  const groupedPlatforms = useMemo(() => {
    const groups = {};

    // Initialize groups
    Object.entries(PLATFORM_CATEGORIES).forEach(([categoryId, category]) => {
      groups[categoryId] = {
        ...category,
        platforms: [],
      };
    });

    // Populate groups with filtered platforms
    filteredPlatforms.forEach((platform) => {
      for (const [categoryId, category] of Object.entries(
        PLATFORM_CATEGORIES
      )) {
        if (category.platforms.includes(platform.id)) {
          groups[categoryId].platforms.push(platform);
          break;
        }
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach((categoryId) => {
      if (groups[categoryId].platforms.length === 0) {
        delete groups[categoryId];
      }
    });

    return groups;
  }, [filteredPlatforms]);

  return {
    searchQuery,
    setSearchQuery,
    filteredPlatforms,
    groupedPlatforms,
    hasResults: filteredPlatforms.length > 0,
  };
}
