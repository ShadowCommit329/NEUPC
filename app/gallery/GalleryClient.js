'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { cn, driveImageUrl } from '../_lib/utils';
import SafeImg from '../_components/ui/SafeImg';
import InlinePagination from '../_components/ui/InlinePagination';

const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), { ssr: false });

// ─── Motion variants (synced with events/achievements pages) ─────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const cardReveal = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const viewport = { once: true, margin: '-40px 0px' };

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 9;

const CATEGORY_META = {
  Achievement: { label: 'Achievements' },
  Contest:     { label: 'Contests'     },
  Workshop:    { label: 'Workshops'    },
  Seminar:     { label: 'Seminars'     },
  Bootcamp:    { label: 'Bootcamps'    },
  Hackathon:   { label: 'Hackathons'   },
  Meetup:      { label: 'Meetups'      },
  Other:       { label: 'Other'        },
};

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'a-z',    label: 'A → Z'        },
  { id: 'z-a',    label: 'Z → A'        },
];

const DEFAULT_STATS = [
  { id: 1, value: '30+',   label: 'Events Hosted'   },
  { id: 2, value: '200+',  label: 'Active Members'  },
  { id: 3, value: '5+',    label: 'Competitions'    },
  { id: 4, value: '1000+', label: 'Photos Captured' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeItem(item) {
  const dateSource = item.date || item.event_date || item.created_at || '';
  return {
    id:          item.id,
    title:       item.title || item.caption || '',
    category:    item.category || 'Other',
    year:        dateSource ? new Date(dateSource).getFullYear().toString() : '',
    image:       item.image || item.image_url || item.url || item.thumbnail || '/images/placeholder.jpg',
    description: item.description || item.caption || '',
    date:        dateSource,
  };
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return ''; }
}

function fmtShortDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short',
    });
  } catch { return ''; }
}

// ─── Stat tile (synced with events page) ──────────────────────────────────────

function StatTile({ value, label, accent = false }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center sm:items-start sm:text-left">
      <span className={cn(
        'font-heading text-2xl font-black tabular-nums sm:text-3xl lg:text-4xl',
        accent ? 'text-neon-lime' : 'text-white'
      )}>
        {value}
      </span>
      <span className="font-mono text-[8px] tracking-[0.22em] text-zinc-500 uppercase sm:text-[9px] lg:text-[10px]">
        {label}
      </span>
    </div>
  );
}

// ─── Gallery card ─────────────────────────────────────────────────────────────

function GalleryCard({ item, onClick }) {
  return (
    <motion.div variants={cardReveal} whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
      <button
        type="button"
        onClick={() => onClick(item)}
        className="group holographic-card w-full overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-lime focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060b]"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-white/3">
          <SafeImg
            src={driveImageUrl(item.image)}
            alt={item.title || 'Gallery photo'}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {/* Category pill */}
          <div className="absolute top-2.5 left-2.5 rounded-full bg-neon-lime/90 px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-black uppercase backdrop-blur-sm">
            {CATEGORY_META[item.category]?.label || item.category}
          </div>

          {/* Year badge */}
          {item.year && (
            <div className="absolute top-2.5 right-2.5 rounded-full border border-white/20 bg-black/50 px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-white backdrop-blur-sm">
              {item.year}
            </div>
          )}

          {/* Zoom hint */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-black/50 backdrop-blur-md">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10 7v6m3-3H7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-1.5 p-4 sm:p-5">
          <h3 className="font-heading text-base font-black leading-snug text-white transition-colors group-hover:text-neon-lime sm:text-lg line-clamp-2">
            {item.title || 'Untitled'}
          </h3>
          {item.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500 sm:text-sm">
              {item.description}
            </p>
          )}
          {item.date && (
            <div className="mt-1 flex items-center gap-1.5 border-t border-white/5 pt-3 font-mono text-[9px] tracking-wider text-zinc-600 uppercase sm:text-[10px]">
              <svg className="h-3 w-3 shrink-0 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {fmtShortDate(item.date)}
            </div>
          )}
        </div>
      </button>
    </motion.div>
  );
}

// ─── Lightbox nav button ──────────────────────────────────────────────────────

function LightboxNavBtn({ direction, onClick }) {
  const isPrev = direction === 'prev';
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={isPrev ? 'Previous photo' : 'Next photo'}
      className={cn(
        'absolute z-50 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-xl transition-all duration-300 hover:border-neon-lime/50 hover:bg-neon-lime/15 hover:text-neon-lime hover:scale-110 sm:h-12 sm:w-12',
        isPrev ? 'left-3 sm:left-4' : 'right-3 sm:right-4'
      )}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={isPrev ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  );
}

// ─── Category dropdown (synced with events page) ──────────────────────────────

function CategorySelect({ categories, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isFiltered = value !== 'all';
  const current = value === 'all' ? 'All Categories' : (CATEGORY_META[value]?.label || value);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all sm:min-w-44',
          isFiltered
            ? 'border-neon-lime/30 bg-neon-lime/8 text-neon-lime'
            : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:text-white'
        )}
      >
        <span className="truncate font-mono text-[10px] tracking-wider uppercase">{current}</span>
        <svg className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-1.5 min-w-full overflow-hidden rounded-xl border border-white/10 bg-[#0e1018] shadow-xl shadow-black/50">
          {categories.map(c => {
            const active = value === c;
            const label = c === 'all' ? 'All Categories' : (CATEGORY_META[c]?.label || c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => { onChange(c); setOpen(false); }}
                className={cn(
                  'flex w-full items-center justify-between gap-8 px-4 py-2.5 font-mono text-[10px] tracking-wider uppercase transition-colors',
                  active ? 'bg-neon-lime/10 text-neon-lime' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                )}
              >
                {label}
                {active && (
                  <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GalleryClient({
  galleryItems: propItems = [],
  stats: propStats = [],
  settings = {},
}) {
  const [search,       setSearch]     = useState('');
  const [activeFilter, setFilter]     = useState('all');
  const [activeYear,   setYear]       = useState('all');
  const [sortBy,       setSort]       = useState('newest');
  const [showSort,     setShowSort]   = useState(false);
  const [currentPage,  setPage]       = useState(1);
  const [lightbox,     setLightbox]   = useState(null);
  const sortRef = useRef(null);

  const galleryItems = useMemo(() => propItems.map(normalizeItem), [propItems]);
  const stats = propStats.length > 0 ? propStats : DEFAULT_STATS;

  const years = useMemo(() =>
    [...new Set(galleryItems.map(i => i.year).filter(Boolean))].sort((a, b) => b - a),
  [galleryItems]);

  const categories = useMemo(() => [
    'all',
    ...Object.keys(
      galleryItems.reduce((acc, i) => { acc[i.category] = true; return acc; }, {})
    ).sort(),
  ], [galleryItems]);

  const categoryCounts = useMemo(() =>
    galleryItems.reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + 1; return acc; }, {}),
  [galleryItems]);

  const filteredItems = useMemo(() => {
    let items = galleryItems;
    if (activeFilter !== 'all') items = items.filter(i => i.category === activeFilter);
    if (activeYear   !== 'all') items = items.filter(i => i.year === activeYear);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q)
      );
    }
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.date || 0) - new Date(b.date || 0);
        case 'a-z':    return (a.title || '').localeCompare(b.title || '');
        case 'z-a':    return (b.title || '').localeCompare(a.title || '');
        default:       return new Date(b.date || 0) - new Date(a.date || 0);
      }
    });
  }, [galleryItems, activeFilter, activeYear, search, sortBy]);

  const totalPages    = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const pagedItems    = useMemo(
    () => filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredItems, currentPage]
  );

  useEffect(() => { setPage(1); }, [activeFilter, activeYear, search, sortBy]);

  useEffect(() => {
    function handler(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSort(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasFilters = activeFilter !== 'all' || activeYear !== 'all' || search.trim() !== '';
  function clearAll() { setSearch(''); setFilter('all'); setYear('all'); setSort('newest'); }

  const navigate = useCallback((dir) => {
    if (!lightbox) return;
    const idx = filteredItems.findIndex(i => i.id === lightbox.id);
    const next = dir === 'next'
      ? (idx + 1) % filteredItems.length
      : (idx - 1 + filteredItems.length) % filteredItems.length;
    setLightbox(filteredItems[next]);
  }, [lightbox, filteredItems]);

  useEffect(() => {
    document.documentElement.style.overflow = lightbox ? 'hidden' : '';
    document.body.style.overflow = lightbox ? 'hidden' : '';
    return () => { document.documentElement.style.overflow = ''; document.body.style.overflow = ''; };
  }, [lightbox]);

  useEffect(() => {
    if (!lightbox) return;
    function handler(e) {
      if (e.key === 'Escape')      setLightbox(null);
      else if (e.key === 'ArrowRight') navigate('next');
      else if (e.key === 'ArrowLeft')  navigate('prev');
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, navigate]);

  const heroTitle = settings?.gallery_page_title || 'Visual Chronicles';
  const heroDesc  = settings?.gallery_page_description ||
    'Capturing innovation, teamwork, and excellence at Netrokona University Programming Club. Every photo tells a story of growth, learning, and community.';
  const liveCount = galleryItems.length;
  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (activeFilter !== 'all' ? 1 : 0) +
    (activeYear !== 'all' ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0);

  return (
    <div className="overflow-x-clip">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[75vh] items-center overflow-hidden px-4 pt-24 pb-16 sm:min-h-[80vh] sm:px-6 sm:pt-28 sm:pb-20 lg:px-8">

        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="grid-overlay absolute inset-0 opacity-25" />
          <div className="absolute -top-24 left-1/4 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-neon-violet/12 blur-[120px] sm:h-[500px] sm:w-[500px]" />
          <div className="absolute top-1/3 right-0 h-[300px] w-[300px] rounded-full bg-neon-lime/8 blur-[120px] sm:h-[400px] sm:w-[400px]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#05060b] to-transparent" />
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mx-auto w-full max-w-screen-xl"
        >
          <div className="max-w-2xl space-y-6 sm:max-w-3xl sm:space-y-8">

            {/* Eyebrow */}
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <span className="pulse-dot bg-neon-lime inline-block h-1.5 w-1.5 rounded-full" />
              <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-400 uppercase sm:text-[11px]">
                {settings?.gallery_page_badge || 'Gallery · NEUPC'}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="kinetic-headline font-heading text-[clamp(2.8rem,11vw,7rem)] font-black leading-none text-white uppercase select-none"
            >
              {heroTitle.includes(' ') ? (
                <>
                  {heroTitle.split(' ').slice(0, -1).join(' ')}<br />
                  <span className="neon-text">{heroTitle.split(' ').slice(-1)[0]}</span>
                </>
              ) : (
                <span className="neon-text">{heroTitle}</span>
              )}
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={fadeUp}
              className="max-w-lg text-sm leading-relaxed text-zinc-400 sm:max-w-xl sm:text-base lg:text-lg"
            >
              {heroDesc}
            </motion.p>

            {/* Count pill */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2.5 rounded-full border border-neon-lime/20 bg-neon-lime/8 px-4 py-2 font-mono text-[10px] tracking-[0.18em] text-neon-lime uppercase sm:px-5 sm:py-2.5 sm:text-[11px]"
            >
              <span className="pulse-dot bg-neon-lime h-1.5 w-1.5 rounded-full" />
              {liveCount > 0 ? `${liveCount} Photos in Archive` : 'Growing Archive'}
            </motion.div>

            {/* Stats row */}
            <motion.div variants={fadeUp} className="border-t border-white/8 pt-6 sm:pt-8">
              <div className="grid grid-cols-4 divide-x divide-white/8">
                {stats.map((s, i) => (
                  <div
                    key={s.id}
                    className={cn(
                      i === 0 ? 'pr-3 sm:pr-6 lg:pr-8' :
                      i === stats.length - 1 ? 'pl-3 sm:pl-6 lg:pl-8' :
                      'px-3 sm:px-6 lg:px-8'
                    )}
                  >
                    <StatTile value={s.value} label={s.label} accent={i === 3} />
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </motion.div>

        {/* Scroll cue */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 lg:flex">
          <span className="font-mono text-[9px] tracking-[0.4em] text-zinc-700 uppercase">Scroll</span>
          <div className="h-7 w-px bg-gradient-to-b from-zinc-600 to-transparent" />
        </div>
      </section>

      {/* ── Search & Filter ───────────────────────────────────────────────── */}
      <section className="px-4 pb-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-screen-xl">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="glass-panel space-y-3 rounded-2xl p-3 sm:p-4"
          >
            {/* Search + sort + year row */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <svg className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search photos…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-9 text-sm text-white outline-none placeholder:text-zinc-600 transition focus:border-neon-lime/30 focus:bg-white/8"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-0.5 text-zinc-500 transition-colors hover:text-white"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Category */}
              {categories.length > 2 && (
                <CategorySelect categories={categories} value={activeFilter} onChange={v => { setFilter(v); setPage(1); }} />
              )}

              {/* Year */}
              {years.length > 1 && (
                <select
                  value={activeYear}
                  onChange={e => { setYear(e.target.value); setPage(1); }}
                  className={cn(
                    'shrink-0 cursor-pointer rounded-xl border px-3 py-2.5 font-mono text-[10px] tracking-wider uppercase outline-none transition-all',
                    activeYear !== 'all'
                      ? 'border-neon-lime/30 bg-neon-lime/8 text-neon-lime'
                      : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:text-white'
                  )}
                >
                  <option value="all" className="bg-[#0e1018]">All Years</option>
                  {years.map(y => (
                    <option key={y} value={y} className="bg-[#0e1018]">{y}</option>
                  ))}
                </select>
              )}

              {/* Sort */}
              <div ref={sortRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSort(v => !v)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2.5 font-mono text-[10px] tracking-wider uppercase transition-all',
                    sortBy !== 'newest'
                      ? 'border-neon-lime/30 bg-neon-lime/8 text-neon-lime'
                      : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:text-white'
                  )}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6M3 12h10M3 17h14" />
                  </svg>
                  <span className="hidden sm:inline">{SORT_OPTIONS.find(s => s.id === sortBy)?.label}</span>
                  <svg className={cn('h-3 w-3 transition-transform duration-200', showSort && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showSort && (
                  <div className="absolute right-0 top-full z-30 mt-1.5 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#0e1018] shadow-xl shadow-black/50">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => { setSort(opt.id); setShowSort(false); setPage(1); }}
                        className={cn(
                          'flex w-full items-center gap-2 px-4 py-2.5 font-mono text-[10px] tracking-wider uppercase transition-colors',
                          sortBy === opt.id ? 'bg-neon-lime/10 text-neon-lime' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        {sortBy === opt.id && (
                          <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        <span className={sortBy !== opt.id ? 'pl-4' : ''}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-2">
              <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-none">
                {categories.map(cat => {
                  const active = activeFilter === cat;
                  const label  = cat === 'all' ? 'All' : (CATEGORY_META[cat]?.label || cat);
                  const count  = cat === 'all' ? galleryItems.length : (categoryCounts[cat] || 0);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setFilter(cat); setPage(1); }}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase transition-all',
                        active
                          ? 'bg-neon-lime text-black shadow-[0_0_16px_-4px_rgba(182,243,107,0.5)]'
                          : 'border border-white/10 text-zinc-500 hover:border-neon-lime/30 hover:text-neon-lime'
                      )}
                    >
                      {label}
                      <span className={cn('rounded-full px-1.5 py-px text-[9px] tabular-nums', active ? 'bg-black/20' : 'bg-white/10')}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-neon-lime/25 bg-neon-lime/8 px-3 py-1.5 font-mono text-[9px] font-bold tracking-wider text-neon-lime uppercase transition-colors hover:bg-neon-lime/15"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {activeFilterCount}
                </button>
              )}
            </div>

            {/* Result count */}
            <p className="px-1 font-mono text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
              {filteredItems.length} photo{filteredItems.length !== 1 ? 's' : ''}
              {hasFilters && (
                <span className="ml-2 text-zinc-700">
                  · {[
                    activeFilter !== 'all' && (CATEGORY_META[activeFilter]?.label || activeFilter),
                    activeYear   !== 'all' && activeYear,
                    search.trim() && `"${search.trim()}"`,
                  ].filter(Boolean).join(' · ')}
                </span>
              )}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Gallery Grid ──────────────────────────────────────────────────── */}
      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-screen-xl">

          {/* Section header */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="mb-8 flex flex-col gap-1 sm:mb-10 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <motion.div variants={fadeUp} className="flex items-center gap-3">
                <span className="bg-neon-lime h-px w-7" />
                <span className="font-mono text-[10px] tracking-[0.35em] text-neon-lime uppercase sm:text-[11px]">
                  Photo Archive
                </span>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="kinetic-headline mt-2 font-heading text-3xl font-black text-white uppercase sm:text-4xl"
              >
                All Photos
              </motion.h2>
            </div>
            <motion.p variants={fadeUp} className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase sm:text-[11px]">
              {filteredItems.length} photo{filteredItems.length !== 1 ? 's' : ''}
            </motion.p>
          </motion.div>

          {pagedItems.length > 0 ? (
            <>
              <motion.div
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
              >
                {pagedItems.map(item => (
                  <GalleryCard key={item.id} item={item} onClick={setLightbox} />
                ))}
              </motion.div>

              <InlinePagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={filteredItems.length}
                perPage={ITEMS_PER_PAGE}
                onPageChange={setPage}
                itemLabel="photo"
              />
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={viewport}
              className="ph flex flex-col items-center gap-3 rounded-2xl py-16 text-center sm:py-24"
            >
              <div className="text-3xl">📷</div>
              <p className="font-heading text-base font-bold text-white sm:text-lg">No photos found</p>
              <p className="font-mono text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
                Try different keywords or clear your filters
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-2 rounded-full border border-white/10 px-4 py-2 font-mono text-[10px] tracking-widest text-zinc-500 uppercase transition-colors hover:border-neon-lime/30 hover:text-neon-lime"
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
            onClick={() => setLightbox(null)}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close lightbox"
              className="group absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:border-red-500/50 hover:bg-red-500/20 sm:h-12 sm:w-12"
            >
              <svg className="h-5 w-5 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <LightboxNavBtn direction="prev" onClick={() => navigate('prev')} />
            <LightboxNavBtn direction="next" onClick={() => navigate('next')} />

            <motion.div
              key={lightbox.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="relative max-h-[90vh] w-full max-w-5xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0e16] shadow-2xl">
                {/* Image */}
                <div className="relative aspect-video bg-[#05060b]">
                  <SafeImg
                    src={driveImageUrl(lightbox.image)}
                    alt={lightbox.title || 'Gallery photo'}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Meta */}
                <div className="border-t border-white/8 p-5 sm:p-7">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-neon-lime/90 px-3 py-0.5 font-mono text-[9px] font-bold tracking-widest text-black uppercase">
                      {CATEGORY_META[lightbox.category]?.label || lightbox.category}
                    </span>
                    {lightbox.year && (
                      <span className="rounded-full border border-white/15 bg-white/8 px-3 py-0.5 font-mono text-[9px] font-bold tracking-widest text-white">
                        {lightbox.year}
                      </span>
                    )}
                  </div>
                  <h2 className="mb-2 font-heading text-xl font-black leading-tight text-white sm:text-2xl lg:text-3xl">
                    {lightbox.title || 'Untitled'}
                  </h2>
                  {lightbox.description && (
                    <p className="mb-3 text-sm leading-relaxed text-zinc-400 sm:text-base line-clamp-3">
                      {lightbox.description}
                    </p>
                  )}
                  {lightbox.date && (
                    <p className="font-mono text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
                      {fmtDate(lightbox.date)}
                    </p>
                  )}
                </div>
              </div>

              {/* Keyboard hint */}
              <div className="mt-4 flex justify-center">
                <div className="inline-flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-2 backdrop-blur-sm">
                  <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.2em] text-zinc-500 uppercase">
                    <kbd className="rounded border border-white/15 bg-white/8 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400">←</kbd>
                    <kbd className="rounded border border-white/15 bg-white/8 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400">→</kbd>
                    Navigate
                  </span>
                  <span className="text-white/15">·</span>
                  <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.2em] text-zinc-500 uppercase">
                    <kbd className="rounded border border-white/15 bg-white/8 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400">Esc</kbd>
                    Close
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollToTop />
    </div>
  );
}
