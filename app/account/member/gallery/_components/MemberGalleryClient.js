/**
 * @file Member gallery client — photo and media gallery browser
 *   with category filtering and lightbox view.
 * @module MemberGalleryClient
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useScrollLock } from '@/app/_lib/hooks';
import {
  Images,
  Video,
  Star,
  Tag,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  ExternalLink,
  SlidersHorizontal,
  ImageIcon,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtYear(str) {
  if (!str) return '';
  return new Date(str).getFullYear().toString();
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ items, index, onClose, onPrev, onNext }) {
  useScrollLock();
  const item = items[index];
  if (!item) return null;

  function handleKeyDown(e) {
    if (e.key === 'ArrowLeft') onPrev();
    else if (e.key === 'ArrowRight') onNext();
    else if (e.key === 'Escape') onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Prev / Next */}
      {items.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute top-1/2 left-2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-white/10 p-2 text-white transition-colors hover:bg-white/20 sm:left-4 sm:p-3"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute top-1/2 right-2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-white/10 p-2 text-white transition-colors hover:bg-white/20 sm:right-4 sm:p-3"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 rounded-full border border-white/15 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <X size={18} />
      </button>

      {/* Counter */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white/50">
        {index + 1} / {items.length}
      </div>

      {/* Content */}
      <div
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 lg:flex-row lg:items-stretch"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media */}
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {item.type === 'video' ? (
            <video
              src={item.url}
              controls
              className="max-h-[65vh] max-w-full rounded-xl object-contain lg:max-h-[80vh]"
            />
          ) : (
            <img
              src={item.url}
              alt={item.caption ?? 'Gallery image'}
              className="max-h-[65vh] max-w-full rounded-xl object-contain lg:max-h-[80vh]"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-image.png';
              }}
            />
          )}
        </div>

        {/* Info panel */}
        <div className="max-h-[30vh] shrink-0 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-[#0f1117]/90 p-4 lg:max-h-[80vh] lg:w-64">
          {item.is_featured && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/15 px-2.5 py-1 text-xs text-amber-400">
              <Star size={10} fill="currentColor" /> Featured
            </div>
          )}

          {item.caption && (
            <p className="text-sm leading-relaxed text-white/80">
              {item.caption}
            </p>
          )}

          <div className="space-y-2 text-xs text-white/50">
            {item.events?.title && (
              <div className="flex items-center gap-2">
                <Calendar size={12} className="shrink-0" />
                <span className="truncate">{item.events.title}</span>
              </div>
            )}
            {item.category && (
              <div className="flex items-center gap-2">
                <Tag size={12} className="shrink-0" />
                <span>{item.category}</span>
              </div>
            )}
            {item.users?.full_name && (
              <div className="flex items-center gap-2">
                <User size={12} className="shrink-0" />
                <span>{item.users.full_name}</span>
              </div>
            )}
            {item.created_at && (
              <div className="flex items-center gap-2">
                <Calendar size={12} className="shrink-0" />
                <span>{fmtDate(item.created_at)}</span>
              </div>
            )}
          </div>

          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-white/8 bg-white/5 px-1.5 py-0.5 text-xs text-white/40"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-violet-400 transition-colors hover:text-violet-300"
          >
            <ExternalLink size={11} /> Open original
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Media Card ───────────────────────────────────────────────────────────────

function MediaCard({ item, onClick }) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onClick}
      className="group relative aspect-square w-full overflow-hidden rounded-xl border border-white/8 bg-white/3 focus:ring-2 focus:ring-violet-500/50 focus:outline-none"
    >
      {item.type === 'video' ? (
        <div className="flex h-full w-full items-center justify-center bg-white/5">
          <Video
            size={32}
            className="text-white/30 transition-colors group-hover:text-violet-400"
          />
        </div>
      ) : imgError ? (
        <div className="flex h-full w-full items-center justify-center bg-white/5">
          <ImageIcon size={28} className="text-white/20" />
        </div>
      ) : (
        <img
          src={item.url}
          alt={item.caption ?? ''}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/50" />

      {/* Top badges */}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {item.is_featured && (
          <span className="rounded-full bg-amber-400/90 p-1 text-amber-900">
            <Star size={9} fill="currentColor" />
          </span>
        )}
        {item.type === 'video' && (
          <span className="rounded-full border border-white/15 bg-black/60 px-1.5 py-0.5 text-xs text-white/80">
            Video
          </span>
        )}
      </div>

      {/* Bottom overlay on hover */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full p-2 transition-transform duration-300 group-hover:translate-y-0">
        {item.caption && (
          <p className="line-clamp-2 text-xs leading-tight text-white/90">
            {item.caption}
          </p>
        )}
        {item.events?.title && (
          <p className="mt-0.5 truncate text-xs text-white/50">
            {item.events.title}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Featured Strip ───────────────────────────────────────────────────────────

function FeaturedStrip({ items, onOpen }) {
  if (!items.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Star size={15} className="text-amber-400" fill="currentColor" />
        <h2 className="text-sm font-semibold tracking-wider text-white/70 uppercase">
          Featured
        </h2>
        <span className="ml-1 text-xs text-white/30">({items.length})</span>
      </div>
      <div className="flex snap-x gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none]">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onOpen(item.id, 'featured')}
            className="group relative h-28 w-40 shrink-0 snap-start overflow-hidden rounded-xl border border-amber-400/20 focus:outline-none sm:h-36 sm:w-56"
          >
            {item.type === 'video' ? (
              <div className="flex h-full w-full items-center justify-center bg-white/5">
                <Video size={24} className="text-white/30" />
              </div>
            ) : (
              <img
                src={item.url}
                alt={item.caption ?? ''}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-2">
              {item.caption && (
                <p className="line-clamp-1 text-xs leading-tight text-white/80">
                  {item.caption}
                </p>
              )}
            </div>
            <div className="absolute top-1.5 right-1.5">
              <span className="block rounded-full bg-amber-400/90 p-1 text-amber-900">
                <Star size={8} fill="currentColor" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MemberGalleryClient({ items = [], stats = {} }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [activeYear, setActiveYear] = useState('all');
  const [sort, setSort] = useState('newest');
  const [lightbox, setLightbox] = useState(null); // { items, index }
  const [showFilters, setShowFilters] = useState(false);

  // Derive unique categories and years
  const { categories, years } = useMemo(() => {
    const cats = [
      ...new Set(items.map((i) => i.category).filter(Boolean)),
    ].sort();
    const yrs = [
      ...new Set(items.map((i) => fmtYear(i.created_at)).filter(Boolean)),
    ].sort((a, b) => b - a);
    return { categories: cats, years: yrs };
  }, [items]);

  const featured = useMemo(() => items.filter((i) => i.is_featured), [items]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...items];
    if (activeCategory !== 'all')
      list = list.filter((i) => i.category === activeCategory);
    if (activeType !== 'all') list = list.filter((i) => i.type === activeType);
    if (activeYear !== 'all')
      list = list.filter((i) => fmtYear(i.created_at) === activeYear);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.caption?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q) ||
          i.events?.title?.toLowerCase().includes(q) ||
          i.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (sort === 'newest')
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sort === 'oldest')
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sort === 'featured') {
      list.sort((a, b) => {
        if (a.is_featured === b.is_featured)
          return new Date(b.created_at) - new Date(a.created_at);
        return a.is_featured ? -1 : 1;
      });
    } else if (sort === 'order') {
      list.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    }
    return list;
  }, [items, activeCategory, activeType, activeYear, search, sort]);

  const openLightbox = useCallback(
    (itemId, mode = 'filtered') => {
      const list = mode === 'featured' ? featured : filtered;
      const idx = list.findIndex((i) => i.id === itemId);
      if (idx !== -1) setLightbox({ items: list, index: idx });
    },
    [featured, filtered]
  );

  const closeLightbox = useCallback(() => setLightbox(null), []);
  const prevLightbox = useCallback(() => {
    setLightbox((l) =>
      l
        ? { ...l, index: (l.index - 1 + l.items.length) % l.items.length }
        : null
    );
  }, []);
  const nextLightbox = useCallback(() => {
    setLightbox((l) =>
      l ? { ...l, index: (l.index + 1) % l.items.length } : null
    );
  }, []);

  const statItems = [
    {
      label: 'Total',
      value: stats.total ?? items.length,
      icon: Images,
      color: 'text-violet-400',
    },
    {
      label: 'Images',
      value: stats.images ?? items.filter((i) => i.type !== 'video').length,
      icon: ImageIcon,
      color: 'text-blue-400',
    },
    {
      label: 'Videos',
      value: stats.videos ?? items.filter((i) => i.type === 'video').length,
      icon: Video,
      color: 'text-cyan-400',
    },
    {
      label: 'Featured',
      value: stats.featured ?? featured.length,
      icon: Star,
      color: 'text-amber-400',
    },
    {
      label: 'Categories',
      value: stats.categories ?? categories.length,
      icon: Tag,
      color: 'text-emerald-400',
    },
  ];

  return (
    <>
      {lightbox && (
        <Lightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={closeLightbox}
          onPrev={prevLightbox}
          onNext={nextLightbox}
        />
      )}

      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              Community Gallery
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Highlights from events, contests &amp; workshops
            </p>
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 self-start rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors sm:self-auto ${
              showFilters
                ? 'border-violet-500/30 bg-violet-600/20 text-violet-300'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/8 hover:text-white'
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters
            {(activeCategory !== 'all' ||
              activeType !== 'all' ||
              activeYear !== 'all') && (
              <span className="h-2 w-2 rounded-full bg-violet-400" />
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
          {statItems.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="flex flex-col gap-1.5 rounded-xl border border-white/8 bg-white/3 p-3 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-2.5"
            >
              <Icon size={16} className={`${color} shrink-0`} />
              <div>
                <div className={`text-base font-bold sm:text-lg ${color}`}>
                  {value}
                </div>
                <div className="text-xs text-white/40">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="space-y-4 rounded-2xl border border-white/8 bg-white/3 p-4 backdrop-blur-sm">
            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute top-1/2 left-3.5 -translate-y-1/2 text-white/30"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search captions, events, tags…"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-4 pl-9 text-sm text-white placeholder-white/30 transition-colors focus:border-violet-500/50 focus:bg-white/8 focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-white/30 transition-colors hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Category */}
              <div className="min-w-35 flex-1">
                <label className="mb-1.5 block text-xs tracking-wider text-white/40 uppercase">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['all', ...categories].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`rounded-lg border px-2.5 py-1 text-xs capitalize transition-colors ${
                        activeCategory === cat
                          ? 'border-violet-500/30 bg-violet-600/20 text-violet-300'
                          : 'border-white/8 bg-white/5 text-white/50 hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="mb-1.5 block text-xs tracking-wider text-white/40 uppercase">
                  Type
                </label>
                <div className="flex gap-1.5">
                  {['all', 'image', 'video'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveType(t)}
                      className={`rounded-lg border px-2.5 py-1 text-xs capitalize transition-colors ${
                        activeType === t
                          ? 'border-violet-500/30 bg-violet-600/20 text-violet-300'
                          : 'border-white/8 bg-white/5 text-white/50 hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      {t === 'all' ? 'All' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year */}
              {years.length > 1 && (
                <div>
                  <label className="mb-1.5 block text-xs tracking-wider text-white/40 uppercase">
                    Year
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['all', ...years].map((yr) => (
                      <button
                        key={yr}
                        onClick={() => setActiveYear(yr)}
                        className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                          activeYear === yr
                            ? 'border-violet-500/30 bg-violet-600/20 text-violet-300'
                            : 'border-white/8 bg-white/5 text-white/50 hover:bg-white/8 hover:text-white'
                        }`}
                      >
                        {yr === 'all' ? 'All years' : yr}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sort */}
              <div>
                <label className="mb-1.5 block text-xs tracking-wider text-white/40 uppercase">
                  Sort
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { v: 'newest', l: 'Newest' },
                    { v: 'oldest', l: 'Oldest' },
                    { v: 'featured', l: 'Featured' },
                    { v: 'order', l: 'Display Order' },
                  ].map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => setSort(v)}
                      className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                        sort === v
                          ? 'border-violet-500/30 bg-violet-600/20 text-violet-300'
                          : 'border-white/8 bg-white/5 text-white/50 hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active filter reset */}
            {(activeCategory !== 'all' ||
              activeType !== 'all' ||
              activeYear !== 'all' ||
              search) && (
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setActiveType('all');
                  setActiveYear('all');
                  setSearch('');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-rose-400 transition-colors hover:text-rose-300"
              >
                <X size={12} /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Quick search (always visible) */}
        {!showFilters && (
          <div className="relative">
            <Search
              size={14}
              className="absolute top-1/2 left-3.5 -translate-y-1/2 text-white/30"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search gallery…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-4 pl-9 text-sm text-white placeholder-white/30 transition-colors focus:border-violet-500/50 focus:bg-white/8 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-white/30 transition-colors hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Category chips (always visible) */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {['all', ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs capitalize transition-colors ${
                  activeCategory === cat
                    ? 'border-violet-500/30 bg-violet-600/20 text-violet-300'
                    : 'border-white/8 bg-white/5 text-white/50 hover:bg-white/8 hover:text-white'
                }`}
              >
                {cat === 'all'
                  ? `All (${items.length})`
                  : `${cat} (${items.filter((i) => i.category === cat).length})`}
              </button>
            ))}
          </div>
        )}

        {/* Featured strip */}
        {featured.length > 0 &&
          activeCategory === 'all' &&
          activeType === 'all' &&
          !search && <FeaturedStrip items={featured} onOpen={openLightbox} />}

        {/* Results count */}
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>
            {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            {search ? ` matching "${search}"` : ''}
          </span>
          {filtered.length !== items.length && (
            <button
              onClick={() => {
                setActiveCategory('all');
                setActiveType('all');
                setActiveYear('all');
                setSearch('');
              }}
              className="text-violet-400 transition-colors hover:text-violet-300"
            >
              Show all
            </button>
          )}
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/8 bg-white/2 py-24">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Images size={28} className="text-white/20" />
            </div>
            <div className="space-y-1 text-center">
              <p className="font-medium text-white/50">No Photos Yet</p>
              <p className="text-sm text-white/30">
                Photos from club events will appear here. Stay active and join
                upcoming events!
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/8 bg-white/2 py-16">
            <Search size={28} className="text-white/20" />
            <p className="text-sm text-white/40">
              No items match your filters.
            </p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setActiveType('all');
                setActiveYear('all');
                setSearch('');
              }}
              className="text-sm text-violet-400 transition-colors hover:text-violet-300"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Grid */
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onClick={() => openLightbox(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
