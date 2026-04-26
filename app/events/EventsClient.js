'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import InlinePagination from '../_components/ui/InlinePagination';
import SafeImg from '../_components/ui/SafeImg';
import FeaturedCarousel from '../_components/ui/FeaturedCarousel';
import { cn, driveImageUrl } from '../_lib/utils';

const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), {
  ssr: false,
});

// ─── Motion variants ──────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const cardReveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const viewport = { once: true, margin: '-40px 0px' };

// ─── Constants ───────────────────────────────────────────────────────────────

const PER_PAGE = 6;

const STATUS_STYLES = {
  upcoming: {
    dot: 'bg-neon-lime pulse-dot',
    text: 'text-neon-lime',
    badge: 'border-neon-lime/30 bg-neon-lime/10 text-neon-lime',
    label: 'Upcoming',
  },
  ongoing: {
    dot: 'bg-neon-violet pulse-dot',
    text: 'text-neon-violet',
    badge: 'border-neon-violet/30 bg-neon-violet/10 text-neon-violet',
    label: 'Live Now',
  },
  completed: {
    dot: 'bg-zinc-500',
    text: 'text-zinc-500',
    badge: 'border-white/10 bg-white/5 text-zinc-400',
    label: 'Completed',
  },
};

const STATUS_TABS = [
  { key: 'active',    label: 'Active' },
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'ongoing',   label: 'Live Now' },
  { key: 'completed', label: 'Completed' },
  { key: 'all',       label: 'All' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getHref(event) {
  return `/events/${event.slug || event.id}`;
}

function getCover(event) {
  return driveImageUrl(event.cover_image || event.banner_image || event.image || '');
}

function fmtDate(value, opts = {}) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', ...opts,
    });
  } catch { return ''; }
}

function fmtTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleTimeString('en-US', {
      timeZone: 'UTC', hour: 'numeric', minute: '2-digit',
    });
  } catch { return ''; }
}

// ─── Stat tile ───────────────────────────────────────────────────────────────

function StatTile({ value, label, mobileLabel, accent = false }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center sm:items-start sm:text-left">
      <span className={cn(
        'font-heading text-2xl font-black tabular-nums sm:text-3xl lg:text-4xl',
        accent ? 'text-neon-lime' : 'text-white'
      )}>
        {value}
      </span>
      <span className="font-mono text-[8px] tracking-[0.22em] text-zinc-500 uppercase sm:text-[9px] lg:text-[10px]">
        <span className="sm:hidden">{mobileLabel || label}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
    </div>
  );
}

// ─── Category dropdown ────────────────────────────────────────────────────────

function CategorySelect({ categories, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const current = value === 'all' ? 'All Categories' : value;
  const isFiltered = value !== 'all';

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all sm:min-w-44',
          isFiltered
            ? 'border-neon-lime/30 bg-neon-lime/8 text-neon-lime'
            : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:text-white'
        )}
      >
        <span className="truncate font-mono text-[10px] tracking-wider uppercase">{current}</span>
        <svg
          className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', open && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1.5 min-w-full overflow-hidden rounded-xl border border-white/10 bg-[#0e1018] shadow-xl shadow-black/50 sm:left-auto sm:right-0">
          {categories.map(c => {
            const label = c === 'all' ? 'All Categories' : c;
            const active = value === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => { onChange(c); setOpen(false); }}
                className={cn(
                  'flex w-full items-center justify-between gap-8 px-4 py-2.5 text-left font-mono text-[10px] tracking-wider uppercase transition-colors',
                  active
                    ? 'bg-neon-lime/10 text-neon-lime'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
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

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event, index = 0 }) {
  const st = STATUS_STYLES[event.status] ?? STATUS_STYLES.upcoming;
  const image = getCover(event);

  return (
    <motion.div variants={cardReveal} whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
      <Link
        href={getHref(event)}
        className="group flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-lime focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060b]"
      >
        {/* Cover image */}
        <div className="relative mb-4 w-full overflow-hidden rounded-xl border border-white/8 aspect-[16/9] bg-white/3 shadow-sm transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-black/40">
          {image ? (
            <SafeImg
              src={image}
              alt={event.title || 'Event'}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-zinc-700">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Category pill – top left */}
          {event.category && (
            <div className="absolute top-2.5 left-2.5 rounded-full bg-neon-lime/90 px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-black uppercase backdrop-blur-sm">
              {event.category}
            </div>
          )}

          {/* Status – bottom left */}
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', st.dot)} />
            <span className={cn('font-mono text-[9px] font-bold tracking-widest uppercase', st.text)}>
              {st.label}
            </span>
          </div>
        </div>

        {/* Text content */}
        <div className="flex flex-1 flex-col gap-2 px-0.5">
          <h3 className="font-heading text-base font-black leading-snug text-white transition-colors duration-200 group-hover:text-neon-lime sm:text-lg">
            {event.title}
          </h3>
          {event.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500 sm:text-sm">
              {event.description}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-white/5 pt-3 font-mono text-[9px] tracking-wider text-zinc-600 uppercase sm:text-[10px]">
            <span>{fmtDate(event.start_date)}</span>
            {event.location && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-white/20" />
                <span className="max-w-[130px] truncate">{event.location}</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Featured banner ──────────────────────────────────────────────────────────

function FeaturedBanner({ event }) {
  const image = getCover(event);
  const st = STATUS_STYLES[event.status] ?? STATUS_STYLES.upcoming;

  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      className="group relative overflow-hidden rounded-2xl border border-white/8 bg-[#08090f] shadow-[0_0_0_1px_rgba(182,243,107,0.06),0_32px_64px_-16px_rgba(0,0,0,0.7)]"
    >
      {/* Neon-lime top accent line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-lime/60 to-transparent z-10" />

      {/* Cover */}
      <div className="relative aspect-[3/2] w-full overflow-hidden sm:aspect-[16/8]">
        {/* Blurred fill so letterbox looks intentional */}
        {image && (
          <SafeImg
            src={image}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-3xl"
          />
        )}
        {image ? (
          <SafeImg
            src={image}
            alt={event.title || 'Featured event'}
            className="absolute inset-0 h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="h-16 w-16 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Gradient lip — melds cover into content panel */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#08090f] to-transparent" />

        {/* Top-left badges */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-lime/25 bg-black/60 px-3 py-1 font-mono text-[9px] font-bold tracking-[0.2em] text-neon-lime uppercase backdrop-blur-xl sm:text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-lime shadow-[0_0_6px_2px_rgba(182,243,107,0.7)]" />
            Featured
          </span>
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[9px] font-bold tracking-[0.2em] uppercase backdrop-blur-xl sm:text-[10px]',
            st.badge
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
            {st.label}
          </span>
        </div>
      </div>

      {/* Content — pulled up slightly into the cover gradient */}
      <div className="relative -mt-6 px-6 pb-7 sm:-mt-8 sm:px-8 sm:pb-9 lg:px-10 lg:pb-10">
        {/* Meta row */}
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {event.start_date && (
            <span className="font-mono text-[10px] tracking-[0.25em] text-neon-lime uppercase sm:text-[11px]">
              {fmtDate(event.start_date)}
              {fmtTime(event.start_date) ? ` · ${fmtTime(event.start_date)}` : ''}
            </span>
          )}
          {event.category && (
            <>
              <span className="h-3 w-px bg-white/15" />
              <span className="font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase sm:text-[11px]">
                {event.category}
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <h3 className="kinetic-headline font-heading text-[1.6rem] font-black leading-[1.05] text-white uppercase sm:text-4xl lg:text-5xl">
          {event.title}
        </h3>

        {/* Neon-lime underline accent */}
        <div className="mt-4 h-px w-12 bg-neon-lime/50 sm:mt-5" />

        {/* Description */}
        {event.description && (
          <p className="mt-4 max-w-2xl text-sm leading-[1.75] text-zinc-400 sm:mt-5 sm:text-[15px]">
            {event.description.length > 220 ? `${event.description.slice(0, 220).trim()}…` : event.description}
          </p>
        )}

        {/* CTA row */}
        <div className="mt-6 flex flex-wrap items-center gap-4 sm:mt-7">
          <Link
            href={getHref(event)}
            className="group/cta relative inline-flex min-h-[44px] items-center gap-2.5 rounded-full bg-neon-lime px-7 py-3 font-heading text-[10px] font-bold tracking-[0.18em] text-black uppercase shadow-[0_0_24px_-4px_rgba(182,243,107,0.5)] transition-all duration-300 hover:shadow-[0_0_40px_-2px_rgba(182,243,107,0.75)] hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-lime focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090f] sm:text-[11px]"
          >
            Learn More
            <span className="transition-transform duration-300 group-hover/cta:translate-x-1">→</span>
          </Link>

          {event.location && (
            <span className="flex items-center gap-2 font-mono text-[10px] tracking-wider text-zinc-500 sm:text-[11px]">
              <svg className="h-3.5 w-3.5 shrink-0 text-neon-lime/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate max-w-[240px]">{event.location}</span>
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}

// ─── Archive row ──────────────────────────────────────────────────────────────

function ArchiveRow({ event }) {
  return (
    <Link
      href={getHref(event)}
      className="group flex items-center justify-between gap-4 border-b border-white/5 py-5 px-2 transition-colors hover:bg-white/[0.02] sm:py-6 sm:px-4"
    >
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-heading text-base font-black text-white transition-colors group-hover:text-neon-lime sm:text-lg">
          {event.title}
        </h4>
        <p className="mt-0.5 font-mono text-[9px] tracking-[0.2em] text-zinc-600 uppercase sm:text-[10px]">
          {event.category ? `${event.category} · ` : ''}
          {fmtDate(event.start_date, { month: 'long', year: 'numeric' })}
        </p>
      </div>
      <span className="shrink-0 font-mono text-[9px] tracking-widest text-zinc-600 uppercase transition-all group-hover:translate-x-1 group-hover:text-neon-lime sm:text-[10px]">
        View →
      </span>
    </Link>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EventsClient({ events = [], settings = {} }) {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('active');
  const [categoryFilter, setCategory] = useState('all');
  const [currentPage, setPage]        = useState(1);
  const [showAllArchive, setShowAll]  = useState(false);

  const counts = useMemo(() => ({
    all:       events.length,
    active:    events.filter(e => ['upcoming','ongoing'].includes(e.status)).length,
    upcoming:  events.filter(e => e.status === 'upcoming').length,
    ongoing:   events.filter(e => e.status === 'ongoing').length,
    completed: events.filter(e => e.status === 'completed').length,
  }), [events]);

  const categories = useMemo(() => [
    'all',
    ...Array.from(new Set(events.map(e => e.category).filter(Boolean))).sort(),
  ], [events]);

  const featuredEvents = useMemo(() => {
    const flagged = events.filter(e => e.is_featured);
    if (flagged.length > 0) {
      const rank = (e) => (['upcoming','ongoing'].includes(e.status) ? 0 : 1);
      return [...flagged].sort((a, b) => rank(a) - rank(b));
    }
    const fallback =
      events.find(e => ['upcoming','ongoing'].includes(e.status)) ||
      events[0];
    return fallback ? [fallback] : [];
  }, [events]);

  const filtered = useMemo(() => {
    let list = [...events];
    if (statusFilter === 'active')     list = list.filter(e => ['upcoming','ongoing'].includes(e.status));
    else if (statusFilter !== 'all')   list = list.filter(e => e.status === statusFilter);
    if (categoryFilter !== 'all')      list = list.filter(e => e.category === categoryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const w = { ongoing: 0, upcoming: 1, completed: 2 };
      const d = (w[a.status] ?? 3) - (w[b.status] ?? 3);
      return d !== 0 ? d : new Date(a.start_date || 0) - new Date(b.start_date || 0);
    });
  }, [events, statusFilter, categoryFilter, search]);

  const archive = useMemo(() =>
    events
      .filter(e => e.status === 'completed')
      .sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0)),
  [events]);

  const totalPages      = Math.ceil(filtered.length / PER_PAGE);
  const pageEvents      = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const visibleArchive  = showAllArchive ? archive : archive.slice(0, 5);

  const heroTitle = settings?.events_page_title || 'Events & Challenges';
  const heroDesc  = settings?.events_page_description ||
    "Join NEUPC's competitive programming events, technical workshops, and elite hackathons designed to sharpen your edge.";
  const liveCount = counts.upcoming + counts.ongoing;

  const gridRef = useRef(null);

  const scrollToGrid = useCallback(() => {
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  function updateStatus(v)   { setStatus(v);   setPage(1); }
  function updateCategory(v) { setCategory(v); setPage(1); }
  function updateSearch(v)   { setSearch(v);   setPage(1); }

  function changePage(v) {
    setPage(v);
    setTimeout(() => scrollToGrid(), 50);
  }

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'active' ? 1 : 0);

  function clearAll() { updateSearch(''); updateCategory('all'); updateStatus('active'); }

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
          className="mx-auto w-full max-w-7xl"
        >
          <div className="max-w-2xl space-y-6 sm:max-w-3xl sm:space-y-8">

            {/* Eyebrow */}
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <span className="pulse-dot bg-neon-lime inline-block h-1.5 w-1.5 rounded-full" />
              <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-400 uppercase sm:text-[11px]">
                {settings?.events_page_badge || 'Events · NEUPC'}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="kinetic-headline font-heading text-[clamp(2.8rem,11vw,7rem)] font-black leading-none text-white uppercase select-none"
            >
              {heroTitle.split('&').length > 1 ? (
                <>
                  {heroTitle.split('&')[0].trim()}
                  <br />
                  <span className="neon-text">&amp; {heroTitle.split('&')[1].trim()}</span>
                </>
              ) : heroTitle}
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={fadeUp}
              className="max-w-lg text-sm leading-relaxed text-zinc-400 sm:max-w-xl sm:text-base lg:text-lg"
            >
              {heroDesc}
            </motion.p>

            {/* Live status pill */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2.5 rounded-full border border-neon-lime/20 bg-neon-lime/8 px-4 py-2 font-mono text-[10px] tracking-[0.18em] text-neon-lime uppercase sm:px-5 sm:py-2.5 sm:text-[11px]"
            >
              <span className="pulse-dot bg-neon-lime h-1.5 w-1.5 rounded-full" />
              {liveCount > 0
                ? `${liveCount} Event${liveCount > 1 ? 's' : ''} Open Now`
                : 'Stay Tuned · More Coming'}
            </motion.div>

            {/* Stats row */}
            <motion.div
              variants={fadeUp}
              className="border-t border-white/8 pt-6 sm:pt-8"
            >
              <div className="grid grid-cols-4 divide-x divide-white/8">
                <div className="pr-3 sm:pr-6 lg:pr-8">
                  <StatTile value={counts.all}       label="Total Events" mobileLabel="Total" />
                </div>
                <div className="px-3 sm:px-6 lg:px-8">
                  <StatTile value={counts.upcoming}  label="Upcoming"     accent />
                </div>
                <div className="px-3 sm:px-6 lg:px-8">
                  <StatTile value={counts.ongoing}   label="Live Now"     mobileLabel="Live" />
                </div>
                <div className="pl-3 sm:pl-6 lg:pl-8">
                  <StatTile value={counts.completed} label="Completed"    mobileLabel="Done" />
                </div>
              </div>
            </motion.div>

          </div>
        </motion.div>

        {/* Scroll cue – desktop only */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 lg:flex">
          <span className="font-mono text-[9px] tracking-[0.4em] text-zinc-700 uppercase">Scroll</span>
          <div className="h-7 w-px bg-gradient-to-b from-zinc-600 to-transparent" />
        </div>
      </section>

      {/* ── Featured events ───────────────────────────────────────────────── */}
      {featuredEvents.length > 0 && (
        <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-7 sm:space-y-9">

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
            >
              <motion.div variants={fadeUp} className="flex items-center gap-3">
                <span className="bg-neon-lime h-px w-7" />
                <span className="font-mono text-[10px] tracking-[0.35em] text-neon-lime uppercase sm:text-[11px]">
                  {featuredEvents.length > 1 ? 'Featured Events' : 'Featured Event'}
                </span>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="kinetic-headline mt-2 font-heading text-3xl font-black text-white uppercase sm:text-4xl"
              >
                Don&apos;t Miss This
              </motion.h2>
            </motion.div>

            <FeaturedCarousel
              items={featuredEvents}
              ariaLabel="Featured events"
              getKey={(e) => e.id ?? e.slug ?? e.title}
              renderItem={(event) => <FeaturedBanner event={event} />}
            />
          </div>
        </section>
      )}

      {/* ── All events grid ───────────────────────────────────────────────── */}
      <section ref={gridRef} className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8" style={{ scrollMarginTop: '80px' }}>
        <div className="mx-auto max-w-7xl space-y-8 sm:space-y-10">

          {/* Section header */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <motion.div variants={fadeUp} className="flex items-center gap-3">
                <span className="bg-neon-lime h-px w-7" />
                <span className="font-mono text-[10px] tracking-[0.35em] text-neon-lime uppercase sm:text-[11px]">
                  Browse Events
                </span>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="kinetic-headline mt-2 font-heading text-3xl font-black text-white uppercase sm:text-4xl"
              >
                All Events
              </motion.h2>
            </div>
            <motion.p variants={fadeUp} className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase sm:text-[11px]">
              {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            </motion.p>
          </motion.div>

          {/* Filters panel */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="glass-panel space-y-3 rounded-2xl p-3 sm:p-4"
          >
            {/* Search + category */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <svg className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => updateSearch(e.target.value)}
                  placeholder="Search events…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-9 text-sm text-white outline-none placeholder:text-zinc-600 transition focus:border-neon-lime/30 focus:bg-white/8"
                />
                {search && (
                  <button
                    onClick={() => updateSearch('')}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-0.5 text-zinc-500 transition-colors hover:text-white"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {categories.length > 2 && (
                <CategorySelect
                  categories={categories}
                  value={categoryFilter}
                  onChange={updateCategory}
                />
              )}
            </div>

            {/* Status tabs + clear-all row */}
            <div className="flex items-center gap-2">
              <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-none">
                {STATUS_TABS.map(tab => {
                  const active = statusFilter === tab.key;
                  const count  = counts[tab.key] ?? counts.all;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => updateStatus(tab.key)}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase transition-all',
                        active
                          ? 'bg-neon-lime text-black shadow-[0_0_16px_-4px_rgba(182,243,107,0.5)]'
                          : 'border border-white/10 text-zinc-500 hover:border-neon-lime/30 hover:text-neon-lime'
                      )}
                    >
                      {tab.label}
                      <span className={cn(
                        'rounded-full px-1.5 py-px text-[9px] tabular-nums',
                        active ? 'bg-black/20' : 'bg-white/10'
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              {activeFilterCount > 0 && (
                <button
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
          </motion.div>

          {/* Cards grid */}
          {pageEvents.length > 0 ? (
            <>
              <motion.div
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3"
              >
                {pageEvents.map((event, i) => (
                  <EventCard key={event.id} event={event} index={i} />
                ))}
              </motion.div>
              <InlinePagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={filtered.length}
                perPage={PER_PAGE}
                onPageChange={changePage}
                itemLabel="event"
              />
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={viewport}
              className="ph flex flex-col items-center gap-3 rounded-2xl py-16 text-center sm:py-24"
            >
              <div className="text-3xl">🔍</div>
              <p className="font-heading text-base font-bold text-white sm:text-lg">No events found</p>
              <p className="font-mono text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
                Try different keywords or clear your filters
              </p>
              {activeFilterCount > 0 && (
                <button
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

      {/* ── Archive ───────────────────────────────────────────────────────── */}
      {archive.length > 0 && (
        <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">

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
                    Past Events
                  </span>
                </motion.div>
                <motion.h2
                  variants={fadeUp}
                  className="kinetic-headline mt-2 font-heading text-3xl font-black text-white uppercase sm:text-4xl"
                >
                  Event Archive
                </motion.h2>
              </div>
              <motion.p variants={fadeUp} className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase sm:text-[11px]">
                {archive.length} completed
              </motion.p>
            </motion.div>

            <motion.div
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
              className="border-t border-white/5"
            >
              {visibleArchive.map((event) => (
                <motion.div key={event.id} variants={cardReveal}>
                  <ArchiveRow event={event} />
                </motion.div>
              ))}
            </motion.div>

            {archive.length > 5 && (
              <div className="mt-8 text-center sm:mt-10">
                <button
                  onClick={() => setShowAll(v => !v)}
                  className="rounded-full border border-white/12 px-8 py-3 font-heading text-[10px] font-bold tracking-widest text-zinc-400 uppercase transition-all hover:border-neon-lime/35 hover:text-neon-lime sm:px-10 sm:py-3.5 sm:text-[11px]"
                >
                  {showAllArchive ? 'Show Less' : `Show All ${archive.length} Events`}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <ScrollToTop />
    </div>
  );
}
