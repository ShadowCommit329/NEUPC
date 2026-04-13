/**
 * @file Discussion Filters Component
 * Filter and search controls for discussions.
 *
 * @module DiscussionFilters
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DISCUSSION_TYPES,
  DISCUSSION_STATUSES,
  DISCUSSION_PRIORITIES,
  SORT_OPTIONS,
  DISCUSSION_TYPE_KEYS,
  DISCUSSION_STATUS_KEYS,
  DISCUSSION_PRIORITY_KEYS,
  SORT_OPTION_KEYS,
} from '@/app/_lib/discussion-config';
import { StatusBadge, TypeBadge, PriorityBadge } from './DiscussionBadges';

/**
 * Dropdown select component.
 */
function Dropdown({
  label,
  value,
  onChange,
  options,
  renderOption,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);

  const selected = options.find((opt) => opt.key === value);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition-colors hover:border-white/20 hover:bg-white/8"
      >
        <span className="text-gray-400">{label}:</span>
        <span className="text-white">{selected?.label || 'All'}</span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 z-50 mt-1 w-48 rounded-xl border border-white/10 bg-gray-900 py-1 shadow-xl"
            >
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                  !value ? 'text-blue-400' : 'text-gray-400'
                }`}
              >
                All
              </button>
              {options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    onChange(option.key);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                    value === option.key ? 'text-blue-400' : 'text-gray-300'
                  }`}
                >
                  {renderOption ? renderOption(option) : option.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Search input component.
 */
function SearchInput({
  value,
  onChange,
  placeholder = 'Search discussions...',
  className = '',
}) {
  const [localValue, setLocalValue] = useState(value || '');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pr-4 pl-10 text-sm text-white placeholder-gray-500 transition-colors outline-none focus:border-blue-500/50 focus:bg-white/8"
      />
      {localValue && (
        <button
          type="button"
          onClick={() => {
            setLocalValue('');
            onChange('');
          }}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Filter chip component.
 */
function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-blue-500/20"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/**
 * Main filters component for discussions.
 */
export function DiscussionFilters({
  filters,
  onFiltersChange,
  showTypeFilter = true,
  showStatusFilter = true,
  showPriorityFilter = true,
  showSortFilter = true,
  showSearch = true,
  showAdvanced = false,
  className = '',
}) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleFilterChange = useCallback(
    (key, value) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  const typeOptions = DISCUSSION_TYPE_KEYS.map((key) => ({
    key,
    label: DISCUSSION_TYPES[key].label,
    short: DISCUSSION_TYPES[key].short,
  }));

  const statusOptions = DISCUSSION_STATUS_KEYS.map((key) => ({
    key,
    label: DISCUSSION_STATUSES[key].label,
  }));

  const priorityOptions = DISCUSSION_PRIORITY_KEYS.map((key) => ({
    key,
    label: DISCUSSION_PRIORITIES[key].label,
  }));

  const sortOptions = SORT_OPTION_KEYS.map((key) => ({
    key,
    label: SORT_OPTIONS[key].label,
  }));

  // Count active filters
  const activeFilterCount = [
    filters.type,
    filters.status,
    filters.priority,
    filters.search,
    filters.myPostsOnly,
    filters.unassignedOnly,
  ].filter(Boolean).length;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {showSearch && (
          <SearchInput
            value={filters.search || ''}
            onChange={(value) => handleFilterChange('search', value)}
            className="w-full sm:w-64"
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {showTypeFilter && (
            <Dropdown
              label="Type"
              value={filters.type}
              onChange={(value) => handleFilterChange('type', value)}
              options={typeOptions}
            />
          )}

          {showStatusFilter && (
            <Dropdown
              label="Status"
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              options={statusOptions}
            />
          )}

          {showPriorityFilter && (
            <Dropdown
              label="Priority"
              value={filters.priority}
              onChange={(value) => handleFilterChange('priority', value)}
              options={priorityOptions}
            />
          )}

          {showSortFilter && (
            <Dropdown
              label="Sort"
              value={filters.sortBy || 'newest'}
              onChange={(value) => handleFilterChange('sortBy', value)}
              options={sortOptions}
            />
          )}

          {showAdvanced && (
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                showAdvancedFilters || activeFilterCount > 0
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-300'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-medium text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Advanced filters */}
      <AnimatePresence>
        {showAdvancedFilters && showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.myPostsOnly || false}
                    onChange={(e) =>
                      handleFilterChange('myPostsOnly', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/30"
                  />
                  <span className="text-sm text-gray-300">My posts only</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.unassignedOnly || false}
                    onChange={(e) =>
                      handleFilterChange('unassignedOnly', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/30"
                  />
                  <span className="text-sm text-gray-300">Unassigned only</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.needsResponse || false}
                    onChange={(e) =>
                      handleFilterChange('needsResponse', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/30"
                  />
                  <span className="text-sm text-gray-300">Needs response</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.includeResolved !== false}
                    onChange={(e) =>
                      handleFilterChange('includeResolved', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/30"
                  />
                  <span className="text-sm text-gray-300">
                    Include resolved
                  </span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Active filters:</span>
          {filters.type && (
            <FilterChip
              label={DISCUSSION_TYPES[filters.type]?.short || filters.type}
              onRemove={() => handleFilterChange('type', null)}
            />
          )}
          {filters.status && (
            <FilterChip
              label={
                DISCUSSION_STATUSES[filters.status]?.label || filters.status
              }
              onRemove={() => handleFilterChange('status', null)}
            />
          )}
          {filters.priority && (
            <FilterChip
              label={
                DISCUSSION_PRIORITIES[filters.priority]?.label ||
                filters.priority
              }
              onRemove={() => handleFilterChange('priority', null)}
            />
          )}
          {filters.search && (
            <FilterChip
              label={`"${filters.search}"`}
              onRemove={() => handleFilterChange('search', '')}
            />
          )}
          {filters.myPostsOnly && (
            <FilterChip
              label="My posts"
              onRemove={() => handleFilterChange('myPostsOnly', false)}
            />
          )}
          <button
            type="button"
            onClick={() => {
              onFiltersChange({
                sortBy: filters.sortBy || 'newest',
              });
            }}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Simple filter tabs for quick filtering.
 */
export function FilterTabs({ activeTab, onTabChange, tabs, className = '' }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onTabChange(tab.key)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? 'bg-blue-500/20 text-blue-300'
              : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                activeTab === tab.key
                  ? 'bg-blue-500/30 text-blue-200'
                  : 'bg-white/10 text-gray-500'
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
