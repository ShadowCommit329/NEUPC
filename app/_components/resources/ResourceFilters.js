'use client';

import { useState } from 'react';
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
} from '@/app/_lib/resources/constants';

const selectClass =
  'w-full appearance-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-gray-300 outline-none transition-all focus:border-blue-500/30 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/15 scheme-dark';

export default function ResourceFilters({
  value,
  categories,
  onChange,
  showVisibility = false,
  showStatus = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const next = (k, v) => onChange({ ...value, [k]: v });

  const hasFilters =
    value.q ||
    value.type ||
    value.categoryId ||
    value.visibility ||
    value.status;

  const activeFilterCount = [
    value.q,
    value.type,
    value.categoryId,
    value.visibility,
    value.status,
  ].filter(Boolean).length;

  const clearAll = () => {
    onChange({
      q: '',
      type: '',
      categoryId: '',
      ...(showVisibility ? { visibility: '' } : {}),
      ...(showStatus ? { status: '' } : {}),
    });
  };

  return (
    <div
      className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4"
      role="search"
      aria-label="Filter resources"
    >
      {/* Filters header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 sm:pointer-events-none"
          aria-expanded={isExpanded}
          aria-controls="resource-filters"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-400">
            Filter Resources
          </span>
          {activeFilterCount > 0 && (
            <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-500/15 px-1 text-[9px] font-bold text-blue-400 tabular-nums">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-gray-600 transition-transform duration-200 sm:hidden ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-blue-400 transition-all hover:bg-blue-500/10 hover:text-blue-300"
            aria-label="Clear all filters"
          >
            <X className="h-3 w-3" />
            <span className="xs:inline hidden">Clear all</span>
          </button>
        )}
      </div>

      {/* Filter controls - always visible on sm+, collapsible on mobile */}
      <div
        id="resource-filters"
        className={`grid grid-cols-1 gap-2.5 transition-all duration-200 sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 ${
          isExpanded ? 'grid' : 'hidden sm:grid'
        }`}
      >
        {/* Search input — spans 2 cols on sm+ */}
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-600" />
          <input
            value={value.q || ''}
            onChange={(e) => next('q', e.target.value)}
            placeholder="Search by title, description, or tags..."
            aria-label="Search resources"
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pr-9 pl-10 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-blue-500/30 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-500/15"
          />
          {value.q && (
            <button
              onClick={() => next('q', '')}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-0.5 text-gray-500 transition-colors hover:text-gray-300"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div>
          <label htmlFor="filter-type" className="sr-only">
            Resource type
          </label>
          <select
            id="filter-type"
            value={value.type || ''}
            onChange={(e) => next('type', e.target.value)}
            className={selectClass}
          >
            <option value="">All Types</option>
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {RESOURCE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        {/* Category filter */}
        <div>
          <label htmlFor="filter-category" className="sr-only">
            Category
          </label>
          <select
            id="filter-category"
            value={value.categoryId || ''}
            onChange={(e) => next('categoryId', e.target.value)}
            className={selectClass}
          >
            <option value="">All Categories</option>
            {(categories || []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Visibility filter (admin) */}
        {showVisibility && (
          <div>
            <label htmlFor="filter-visibility" className="sr-only">
              Visibility
            </label>
            <select
              id="filter-visibility"
              value={value.visibility || ''}
              onChange={(e) => next('visibility', e.target.value)}
              className={selectClass}
            >
              <option value="">All Visibility</option>
              <option value="public">Public</option>
              <option value="members">Members</option>
            </select>
          </div>
        )}

        {/* Status filter (admin) */}
        {showStatus && (
          <div>
            <label htmlFor="filter-status" className="sr-only">
              Status
            </label>
            <select
              id="filter-status"
              value={value.status || ''}
              onChange={(e) => next('status', e.target.value)}
              className={selectClass}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}
      </div>

      {/* Active filters summary on mobile when collapsed */}
      {!isExpanded && hasFilters && (
        <div className="flex flex-wrap gap-1.5 sm:hidden">
          {value.q && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-blue-500/15 bg-blue-500/[0.06] px-2 py-0.5 text-[10px] text-blue-400">
              Search: &quot;
              {value.q.length > 15 ? value.q.slice(0, 15) + '...' : value.q}
              &quot;
              <button
                onClick={() => next('q', '')}
                aria-label="Remove search filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {value.type && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-purple-500/15 bg-purple-500/[0.06] px-2 py-0.5 text-[10px] text-purple-400">
              {RESOURCE_TYPE_LABELS[value.type] || value.type}
              <button
                onClick={() => next('type', '')}
                aria-label="Remove type filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {value.categoryId && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-2 py-0.5 text-[10px] text-emerald-400">
              {categories?.find((c) => c.id === value.categoryId)?.name ||
                'Category'}
              <button
                onClick={() => next('categoryId', '')}
                aria-label="Remove category filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
