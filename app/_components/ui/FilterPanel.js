/**
 * @file Reusable filter panel with search, sort, category pills, view toggle.
 * Replaces duplicated filter UI across BlogsClient, EventsClient,
 * RoadmapsClient, GalleryClient.
 *
 * @module FilterPanel
 */

'use client';

import { useRef } from 'react';
import { cn } from '@/app/_lib/utils';

// ─── Search Icon (inline SVG) ─────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}

// ─── FilterPanel ──────────────────────────────────────────────────────────────

/**
 * FilterPanel — Reusable search + sort + category pills + view toggle.
 *
 * @param {Object} props
 * @param {string}   props.search            - Current search query
 * @param {(e: React.ChangeEvent) => void} props.onSearchChange
 * @param {string}   props.searchPlaceholder - Placeholder text
 *
 * @param {string}   props.sortBy            - Current sort key
 * @param {(e: React.ChangeEvent) => void} props.onSortChange
 * @param {{ key: string, label: string }[]} props.sortOptions
 *
 * @param {{ key: string, label: string, icon?: string, color?: string, count?: number }[]} [props.categories]
 * @param {string}   [props.activeCategory]  - Currently active category key
 * @param {(key: string) => void} [props.onCategoryChange]
 * @param {(cat: { key: string }) => string} [props.getCategoryClasses] - Returns pill classes for a category
 *
 * @param {boolean}  [props.showViewToggle]
 * @param {string}   [props.view]            - 'grid' | 'list'
 * @param {(view: string) => void} [props.onViewChange]
 *
 * @param {boolean}  [props.hasFilters]      - Whether any filter is active
 * @param {number}   [props.activeFilterCount]
 * @param {() => void} [props.onReset]       - Reset all filters
 *
 * @param {React.ReactNode} [props.extraRow] - Optional extra row (e.g. status tabs)
 */
export default function FilterPanel({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',

  sortBy,
  onSortChange,
  sortOptions = [],

  categories = [],
  activeCategory = '',
  onCategoryChange,
  getCategoryClasses,

  showViewToggle = false,
  view = 'grid',
  onViewChange,

  hasFilters = false,
  activeFilterCount = 0,
  onReset,

  extraRow,
}) {
  const searchRef = useRef(null);

  return (
    <div className="mb-10 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm">
      <div className="px-5 py-5 sm:px-6">
        {/* Row 1: Search + controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <SearchIcon />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-9 pl-10 text-sm text-white placeholder-gray-600 transition-all outline-none focus:border-primary-500/40 focus:bg-white/7 focus:ring-1 focus:ring-primary-500/20"
            />
            {search && (
              <button
                onClick={() => {
                  onSearchChange({ target: { value: '' } });
                  searchRef.current?.focus();
                }}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-0.5 text-gray-500 transition-colors hover:text-white"
                aria-label="Clear search"
              >
                <ClearIcon />
              </button>
            )}
          </div>

          {/* Right-side controls */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Sort */}
            {sortOptions.length > 0 && (
              <select
                value={sortBy}
                onChange={onSortChange}
                className="appearance-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pr-8 text-sm text-gray-400 scheme-dark transition-all outline-none focus:border-white/20 focus:text-white"
              >
                {sortOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}

            {/* View toggle */}
            {showViewToggle && onViewChange && (
              <div className="flex items-center rounded-xl border border-white/10 bg-white/4 p-0.5">
                <button
                  onClick={() => onViewChange('list')}
                  aria-label="List view"
                  className={cn(
                    'rounded-lg px-2.5 py-2 transition-all',
                    view === 'list'
                      ? 'bg-white/12 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                  )}
                >
                  <ListIcon />
                </button>
                <button
                  onClick={() => onViewChange('grid')}
                  aria-label="Grid view"
                  className={cn(
                    'rounded-lg px-2.5 py-2 transition-all',
                    view === 'grid'
                      ? 'bg-white/12 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                  )}
                >
                  <GridIcon />
                </button>
              </div>
            )}

            {/* Clear filters badge */}
            {hasFilters && onReset && (
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs font-medium text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/15"
              >
                <ClearIcon />
                Clear
                {activeFilterCount > 1 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500/40 text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Optional extra row (e.g. status tabs) */}
        {extraRow && <div className="mt-4">{extraRow}</div>}

        {/* Category pills row */}
        {categories.length > 0 && onCategoryChange && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.key;
              const classes = getCategoryClasses
                ? getCategoryClasses(cat, isActive)
                : isActive
                  ? 'border-primary-400/60 bg-primary-500/30 text-primary-200'
                  : 'border-white/10 bg-white/4 text-gray-400 hover:border-white/20 hover:text-gray-300';

              return (
                <button
                  key={cat.key}
                  onClick={() => onCategoryChange(cat.key)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                    classes
                  )}
                >
                  {cat.icon && <span className="text-sm">{cat.icon}</span>}
                  {cat.label}
                  {cat.count != null && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-[10px] font-bold',
                        isActive ? 'bg-white/20' : 'bg-white/10'
                      )}
                    >
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
