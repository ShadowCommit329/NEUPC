/**
 * @file Gallery page client component.
 * Filterable photo gallery with lightbox modal and keyboard navigation.
 *
 * @module GalleryClient
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import CTASection from '../_components/ui/CTASection';
import dynamic from 'next/dynamic';
const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), {
  ssr: false,
});
import EmptyState from '../_components/ui/EmptyState';
import PageBackground from '../_components/ui/PageBackground';
import PageShell from '../_components/ui/PageShell';
import { useDelayedLoad, useScrollReveal } from '../_lib/hooks';
import { cn, driveImageUrl } from '../_lib/utils';
import SafeImg from '../_components/ui/SafeImg';

/** Icon & label overrides for known categories */
const CATEGORY_META = {
  Achievement: { label: 'Achievements', icon: '🥇' },
  Contest: { label: 'Contests', icon: '🏆' },
  Workshop: { label: 'Workshops', icon: '🛠️' },
  Seminar: { label: 'Seminars', icon: '🎤' },
  Bootcamp: { label: 'Bootcamps', icon: '🚀' },
  Hackathon: { label: 'Hackathons', icon: '💻' },
  Meetup: { label: 'Meetups', icon: '🤝' },
  Other: { label: 'Other', icon: '📌' },
};

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'a-z', label: 'A → Z' },
  { id: 'z-a', label: 'Z → A' },
];

const ITEMS_PER_PAGE = 12;

/** @type {{ id: number, value: string, label: string }[]} Default stats */
const DEFAULT_STATS = [
  { id: 1, value: '30+', label: 'Events Hosted' },
  { id: 2, value: '200+', label: 'Active Members' },
  { id: 3, value: '5+', label: 'Competitions' },
  { id: 4, value: '1000+', label: 'Photos Captured' },
];

/**
 * Normalize a gallery item from DB format.
 * Handles both gallery_items and event_gallery shapes.
 * @param {Object} item - Raw gallery item from DB
 * @returns {Object} Normalized gallery item
 */
function normalizeItem(item) {
  const dateSource = item.date || item.event_date || item.created_at || '';
  return {
    id: item.id,
    title: item.title || item.caption || '',
    category: item.category || 'Other',
    year: dateSource ? new Date(dateSource).getFullYear().toString() : '',
    image:
      item.image ||
      item.image_url ||
      item.url ||
      item.thumbnail ||
      '/images/placeholder.jpg',
    description: item.description || item.caption || '',
    date: dateSource,
  };
}

/**
 * Format a date string for display.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Single gallery card with hover effects.
 * @param {{ item: Object, onClick: Function }} props
 */
function GalleryCard({ item, onClick }) {
  return (
    <div
      className="group hover:border-primary-500/30 hover:shadow-primary-500/10 relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl"
      onClick={() => onClick(item)}
    >
      {/* Image */}
      <div className="relative aspect-4/3 cursor-pointer overflow-hidden bg-gray-900">
        <SafeImg
          src={driveImageUrl(item.image)}
          alt={item.title || 'Gallery photo'}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

        <div className="absolute top-3 left-3 z-10 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {item.category}
        </div>
        <div className="absolute top-3 right-3 z-10 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
          {item.year}
        </div>

        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/60 to-transparent opacity-0 transition-all duration-500 group-hover:opacity-100" />
        <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 scale-75 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100">
          <div className="shadow-primary-500/50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-white/20 shadow-lg backdrop-blur-lg">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 sm:p-5">
        <h3 className="group-hover:text-primary-300 mb-2 text-base leading-tight font-bold text-white transition-colors duration-300 sm:text-lg">
          {item.title}
        </h3>
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-400 transition-colors group-hover:text-gray-300 sm:text-sm">
          {item.description}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 sm:text-sm">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-gray-400">{formatDisplayDate(item.date)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Lightbox navigation button.
 * @param {{ direction: 'prev'|'next', onClick: Function }} props
 */
function LightboxNavButton({ direction, onClick }) {
  const isPrev = direction === 'prev';
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'group hover:border-primary-500/50 hover:bg-primary-500/20 hover:shadow-primary-500/50 absolute z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:shadow-lg sm:h-12 sm:w-12',
        isPrev ? 'left-4' : 'right-4'
      )}
    >
      <svg
        className={cn(
          'h-6 w-6 transition-transform duration-300',
          isPrev ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'
        )}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={isPrev ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  );
}

/**
 * Gallery page with search, filtering, sorting, grid layout, and lightbox.
 */
export default function GalleryClient({
  galleryItems: propItems = [],
  stats: propStats = [],
  settings = {},
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeYear, setActiveYear] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState(null);
  const isLoaded = useDelayedLoad();
  const [gridRef, gridVisible] = useScrollReveal({ threshold: 0.05 });
  const searchInputRef = useRef(null);
  const sortRef = useRef(null);

  const galleryItems = useMemo(() => propItems.map(normalizeItem), [propItems]);
  const stats = propStats.length > 0 ? propStats : DEFAULT_STATS;

  // Derive unique years from data
  const years = useMemo(() => {
    const uniqueYears = [
      ...new Set(galleryItems.map((i) => i.year).filter(Boolean)),
    ].sort((a, b) => b - a);
    return uniqueYears;
  }, [galleryItems]);

  // Build dynamic category list from actual data
  const { categories, activeCategoryCounts } = useMemo(() => {
    const counts = {};
    galleryItems.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    const cats = [
      { id: 'all', label: 'All', icon: '🎯' },
      ...Object.keys(counts)
        .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
        .map((key) => ({
          id: key,
          label: CATEGORY_META[key]?.label || key,
          icon: CATEGORY_META[key]?.icon || '📂',
        })),
    ];
    return { categories: cats, activeCategoryCounts: counts };
  }, [galleryItems]);

  // Filtered + sorted items
  const filteredItems = useMemo(() => {
    let items = galleryItems;

    // Category filter
    if (activeFilter !== 'all') {
      items = items.filter((item) => item.category === activeFilter);
    }

    // Year filter
    if (activeYear !== 'all') {
      items = items.filter((item) => item.year === activeYear);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q))
      );
    }

    // Sort
    items = [...items].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.date || 0) - new Date(b.date || 0);
        case 'a-z':
          return (a.title || '').localeCompare(b.title || '');
        case 'z-a':
          return (b.title || '').localeCompare(a.title || '');
        case 'newest':
        default:
          return new Date(b.date || 0) - new Date(a.date || 0);
      }
    });

    return items;
  }, [galleryItems, activeFilter, activeYear, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(
    () =>
      filteredItems.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      ),
    [filteredItems, currentPage]
  );

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, activeYear, searchQuery, sortBy]);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target))
        setShowSortMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasActiveFilters =
    activeFilter !== 'all' || activeYear !== 'all' || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setSearchQuery('');
    setActiveFilter('all');
    setActiveYear('all');
    setSortBy('newest');
  };

  const navigate = useCallback(
    (dir) => {
      if (!selectedImage) return;
      const idx = filteredItems.findIndex(
        (item) => item.id === selectedImage.id
      );
      const next =
        dir === 'next'
          ? (idx + 1) % filteredItems.length
          : (idx - 1 + filteredItems.length) % filteredItems.length;
      setSelectedImage(filteredItems[next]);
    },
    [selectedImage, filteredItems]
  );

  // Manage body overflow
  useEffect(() => {
    document.documentElement.style.overflow = selectedImage ? 'hidden' : '';
    document.body.style.overflow = selectedImage ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [selectedImage]);

  // Keyboard navigation
  useEffect(() => {
    if (!selectedImage) return;
    const handler = (e) => {
      if (e.key === 'Escape') setSelectedImage(null);
      else if (e.key === 'ArrowRight') navigate('next');
      else if (e.key === 'ArrowLeft') navigate('prev');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedImage, navigate]);

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 md:py-24 lg:px-8 lg:py-28">
        <PageBackground />

        <div className="relative mx-auto max-w-7xl text-center">
          <div
            className={cn(
              'text-primary-300 ring-primary-500/20 bg-primary-500/10 mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ring-1 transition-all duration-700 sm:text-sm',
              isLoaded
                ? 'translate-y-0 opacity-100'
                : '-translate-y-4 opacity-0'
            )}
          >
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {settings?.gallery_page_badge || 'Photo Gallery'}
          </div>

          <h1
            className={cn(
              'from-primary-300 to-secondary-300 mb-4 bg-linear-to-r via-white bg-clip-text text-3xl leading-tight font-extrabold text-transparent transition-all delay-100 duration-700 sm:text-4xl md:text-5xl lg:text-6xl',
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            )}
          >
            {settings?.gallery_page_title || 'Moments That Define Us'}
          </h1>

          <p
            className={cn(
              'mx-auto mb-10 max-w-3xl text-sm leading-relaxed text-gray-300 transition-all delay-200 duration-700 sm:text-base md:text-lg lg:text-xl',
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            )}
          >
            {settings?.gallery_page_description ||
              'Capturing innovation, teamwork, and excellence at Netrokona University Programming Club. Every photo tells a story of growth, learning, and community.'}
          </p>

          {/* Stats */}
          <div
            className={cn(
              'mx-auto grid max-w-5xl gap-4 transition-all delay-300 duration-700 sm:grid-cols-2 lg:grid-cols-4',
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            )}
          >
            {stats.map((stat) => (
              <div
                key={stat.id}
                className="group hover:border-primary-500/30 hover:shadow-primary-500/10 relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition-all duration-500 hover:scale-105 hover:bg-white/10 hover:shadow-xl"
              >
                <div className="from-primary-500/0 via-primary-500/5 to-secondary-500/0 absolute inset-0 bg-linear-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative">
                  <div className="group-hover:text-primary-300 mb-1 text-2xl font-bold text-white transition-all sm:text-3xl">
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-400 transition-all group-hover:text-gray-300 sm:text-sm">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Search & Filter Bar ── */}
      <section className="relative px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          {/* Search + Sort row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <svg
                  className="h-4.5 w-4.5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search photos by title, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pr-10 pl-11 text-sm text-white placeholder-gray-500 backdrop-blur-xl transition-all duration-300 focus:border-violet-500/50 focus:bg-white/8 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-white"
                  aria-label="Clear search"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Year dropdown */}
            {years.length > 1 && (
              <select
                value={activeYear}
                onChange={(e) => setActiveYear(e.target.value)}
                className="min-w-30 cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-xl transition-all duration-300 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
              >
                <option value="all" className="bg-gray-900">
                  All Years
                </option>
                {years.map((y) => (
                  <option key={y} value={y} className="bg-gray-900">
                    {y}
                  </option>
                ))}
              </select>
            )}

            {/* Sort dropdown */}
            <div ref={sortRef} className="relative">
              <button
                onClick={() => setShowSortMenu((p) => !p)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/8 hover:text-white"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 7h6M3 12h10M3 17h14"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {SORT_OPTIONS.find((s) => s.id === sortBy)?.label}
                </span>
                <svg
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    showSortMenu && 'rotate-180'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showSortMenu && (
                <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-gray-900/95 shadow-2xl backdrop-blur-xl">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSortBy(opt.id);
                        setShowSortMenu(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors',
                        sortBy === opt.id
                          ? 'bg-violet-500/15 text-violet-300'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      {sortBy === opt.id && (
                        <svg
                          className="h-3.5 w-3.5 shrink-0 text-violet-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      )}
                      <span className={sortBy !== opt.id ? 'pl-5.5' : ''}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => {
              const count =
                cat.id === 'all'
                  ? galleryItems.length
                  : activeCategoryCounts[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveFilter(cat.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-300 sm:text-sm',
                    activeFilter === cat.id
                      ? 'border-violet-500/40 bg-violet-500/15 text-violet-200 shadow-lg shadow-violet-900/20'
                      : 'border-white/8 bg-white/3 text-gray-400 hover:border-white/15 hover:bg-white/7 hover:text-white'
                  )}
                >
                  <span className="text-sm">{cat.icon}</span>
                  {cat.label}
                  <span
                    className={cn(
                      'text-2.5 ml-0.5 rounded-full px-1.5 py-0.5 font-bold tabular-nums',
                      activeFilter === cat.id
                        ? 'bg-violet-500/25 text-violet-300'
                        : 'bg-white/8 text-gray-500'
                    )}
                  >
                    {count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Results bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/2 px-4 py-2.5 backdrop-blur-sm">
            <p className="flex items-center gap-2 text-sm text-gray-400">
              <svg
                className="text-primary-400 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z"
                />
              </svg>
              <span>
                Showing{' '}
                <span className="font-semibold text-white">
                  {filteredItems.length}
                </span>{' '}
                of {galleryItems.length} photo
                {galleryItems.length !== 1 ? 's' : ''}
              </span>
              {hasActiveFilters && (
                <span className="text-gray-600">
                  ·{' '}
                  {[
                    activeFilter !== 'all' &&
                      (CATEGORY_META[activeFilter]?.label || activeFilter),
                    activeYear !== 'all' && activeYear,
                    searchQuery.trim() && `"${searchQuery.trim()}"`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              )}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-400 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section
        ref={gridRef}
        className="relative px-4 py-8 sm:px-6 sm:py-12 md:py-16 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paginatedItems.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  'transition-all duration-700',
                  gridVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-8 opacity-0'
                )}
                style={{
                  transitionDelay: gridVisible
                    ? `${Math.min(index * 60, 600)}ms`
                    : '0ms',
                }}
              >
                <GalleryCard item={item} onClick={setSelectedImage} />
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <EmptyState
              icon="📷"
              title={
                searchQuery
                  ? 'No matching photos'
                  : 'No photos in this category'
              }
              description={
                searchQuery
                  ? `No results for "${searchQuery}". Try a different search term or clear filters.`
                  : 'Try selecting a different category or clearing filters.'
              }
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                aria-label="Previous page"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .reduce((acc, page, i, arr) => {
                  if (i > 0 && page - arr[i - 1] > 1) {
                    acc.push('...' + page);
                  }
                  acc.push(page);
                  return acc;
                }, [])
                .map((page) =>
                  typeof page === 'string' ? (
                    <span
                      key={page}
                      className="flex h-10 w-6 items-center justify-center text-sm text-gray-600"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-medium transition-all',
                        currentPage === page
                          ? 'border-violet-500/40 bg-violet-500/15 text-violet-200 shadow-lg shadow-violet-900/20'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {page}
                    </button>
                  )
                )}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                aria-label="Next page"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </section>

      <CTASection
        icon="📸"
        title={
          settings?.gallery_page_cta_title || 'Join the Programming Club Today'
        }
        description={
          settings?.gallery_page_cta_description ||
          'Be part of creating these memorable moments. Join us in our next competition, workshop, or community event.'
        }
        primaryAction={{ label: 'Become a Member', href: '/join' }}
        secondaryAction={{ label: 'View Upcoming Events', href: '/events' }}
      />

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="group absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:border-red-500/50 hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/50 sm:h-12 sm:w-12"
          >
            <svg
              className="h-6 w-6 transition-transform group-hover:rotate-90"
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
          </button>

          <LightboxNavButton
            direction="prev"
            onClick={() => navigate('prev')}
          />
          <LightboxNavButton
            direction="next"
            onClick={() => navigate('next')}
          />

          <div
            className="relative max-h-[90vh] w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/5 shadow-2xl backdrop-blur-xl">
              <div className="relative aspect-16/10 bg-gray-900">
                <SafeImg
                  src={driveImageUrl(selectedImage.image)}
                  alt={selectedImage.title || 'Gallery photo'}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="border-t border-white/10 bg-linear-to-b from-transparent to-black/20 p-4 sm:p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="border-primary-500/30 bg-primary-500/10 text-primary-300 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm">
                    {selectedImage.category}
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                    {selectedImage.year}
                  </span>
                </div>
                <h2 className="mb-2 text-xl leading-tight font-bold text-white sm:text-2xl lg:text-3xl">
                  {selectedImage.title}
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-gray-300 sm:text-base">
                  {selectedImage.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400 sm:text-sm">
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{formatDisplayDate(selectedImage.date)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                <p className="flex items-center gap-2 text-xs text-gray-400 sm:text-sm">
                  <kbd className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold text-white">
                    ←
                  </kbd>
                  <kbd className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold text-white">
                    →
                  </kbd>
                  <span>Navigate</span>
                </p>
                <span className="text-gray-500">•</span>
                <p className="flex items-center gap-2 text-xs text-gray-400 sm:text-sm">
                  <kbd className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold text-white">
                    ESC
                  </kbd>
                  <span>Close</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ScrollToTop />
    </PageShell>
  );
}
