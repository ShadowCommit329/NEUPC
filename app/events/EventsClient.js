'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import InlinePagination from '../_components/ui/InlinePagination';
import SafeImg from '../_components/ui/SafeImg';
import { cn, driveImageUrl } from '../_lib/utils';

const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), {
  ssr: false,
});

// ─── Motion variants (matching homepage cadence) ─────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
  },
};

const cardReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
  },
};

const viewport = { once: true, margin: '-50px 0px' };

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

const CARD_ACCENT = [
  { cat: 'border-neon-violet/20', hover: 'group-hover:text-neon-violet', tag: 'bg-neon-violet/90 text-black' },
  { cat: 'border-neon-lime/20',   hover: 'group-hover:text-neon-lime',   tag: 'bg-neon-lime/90 text-black' },
  { cat: 'border-white/10',       hover: 'group-hover:text-white',        tag: 'bg-white/90 text-black' },
];

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

function StatTile({ value, label, accent = false }) {
  return (
    <div className="flex flex-col gap-1 border-l border-white/10 pl-6 first:border-l-0 first:pl-0">
      <span className={cn('font-heading text-2xl font-black stat-numeral', accent ? 'text-neon-lime' : 'text-white')}>
        {value}
      </span>
      <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase">{label}</span>
    </div>
  );
}

// ─── Event card (grid) ────────────────────────────────────────────────────────

function EventCard({ event, index = 0 }) {
  const accent = CARD_ACCENT[index % CARD_ACCENT.length];
  const st = STATUS_STYLES[event.status] ?? STATUS_STYLES.upcoming;
  const image = getCover(event);

  return (
    <motion.div variants={cardReveal} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
      <Link
        href={getHref(event)}
        className="group relative flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-lime"
      >
        {/* Image */}
        <div className={cn(
          'relative mb-5 w-full overflow-hidden rounded-2xl border transition-shadow duration-500 aspect-[4/3] md:aspect-[4/5]',
          'holographic-card',
          accent.cat,
          'shadow-md group-hover:shadow-xl'
        )}>
          {image ? (
            <SafeImg
              src={image}
              alt={event.title || 'Event'}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full ph flex items-center justify-center font-mono text-3xl opacity-40">[ ]</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

          {/* Category tag */}
          {event.category && (
            <div className={cn(
              'absolute top-3 left-3 rounded-full px-3 py-1 font-mono text-[10px] font-bold tracking-widest uppercase backdrop-blur-md sm:top-4 sm:left-4',
              accent.tag
            )}>
              {event.category}
            </div>
          )}

          {/* Status badge */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 sm:bottom-4 sm:left-4">
            <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
            <span className={cn('font-mono text-[10px] font-bold tracking-widest uppercase', st.text)}>
              {st.label}
            </span>
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-1 flex-col gap-3 px-1">
          <h3 className={cn(
            'kinetic-headline font-heading text-xl font-black tracking-tight text-white uppercase transition-colors duration-300 sm:text-2xl',
            accent.hover
          )}>
            {event.title}
          </h3>
          {event.description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-zinc-500">
              {event.description}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/5 pt-4 font-mono text-[10px] tracking-widest text-zinc-600 uppercase">
            <span>{fmtDate(event.start_date)}</span>
            {event.location && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/10" />
                <span className="max-w-[120px] truncate">{event.location}</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Featured event banner ────────────────────────────────────────────────────

function FeaturedBanner({ event }) {
  const image = getCover(event);
  const st = STATUS_STYLES[event.status] ?? STATUS_STYLES.upcoming;

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      className="glass-panel overflow-hidden rounded-2xl border border-neon-lime/10"
    >
      <div className="grid lg:grid-cols-2">
        {/* Image */}
        <div className="relative min-h-72 lg:min-h-[420px]">
          {image ? (
            <SafeImg
              src={image}
              alt={event.title || 'Featured event'}
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="ph-lime absolute inset-0 flex items-center justify-center font-mono text-5xl opacity-40">
              {'{ }'}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#05060b]/90 via-[#05060b]/20 to-transparent lg:bg-gradient-to-r" />

          {/* Status floating */}
          <div className={cn(
            'absolute top-4 left-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase backdrop-blur-md',
            st.badge
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
            {st.label}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col justify-center gap-6 p-8 lg:p-14">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-neon-lime/30 bg-neon-lime/10 px-4 py-1 font-mono text-[10px] font-bold tracking-widest text-neon-lime uppercase">
              Featured Event
            </span>
            {event.start_date && (
              <span className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
                {fmtDate(event.start_date)}
                {fmtTime(event.start_date) ? ` · ${fmtTime(event.start_date)}` : ''}
              </span>
            )}
          </div>

          <h3 className="kinetic-headline font-heading text-3xl font-black text-white uppercase sm:text-4xl lg:text-5xl">
            {event.title}
          </h3>

          {event.description && (
            <p className="text-base leading-relaxed text-zinc-400 lg:text-lg">
              {event.description}
            </p>
          )}

          {event.location && (
            <p className="font-mono text-xs tracking-widest text-zinc-600 uppercase">
              📍 {event.location}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href={getHref(event)}
                className="inline-flex items-center gap-2 rounded-full bg-neon-lime px-8 py-3.5 font-heading text-[11px] font-bold tracking-widest text-black uppercase shadow-[0_0_40px_-10px_rgba(182,243,107,0.6)] transition-shadow hover:shadow-[0_0_60px_-5px_rgba(182,243,107,0.8)]"
              >
                Register Now <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href={getHref(event)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-3.5 font-heading text-[11px] font-bold tracking-widest text-zinc-200 uppercase backdrop-blur-sm transition-all hover:border-neon-lime/50 hover:text-white"
              >
                Event Details
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Archive row ─────────────────────────────────────────────────────────────

function ArchiveRow({ event, index }) {
  const id = `${String(index + 1).padStart(3, '0')}`;
  return (
    <div className="group flex flex-col gap-4 border-b border-white/5 py-7 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-10">
        <span className="font-mono text-[10px] tracking-[0.25em] text-zinc-700 uppercase">
          EVT_{id}
        </span>
        <div>
          <h4 className="font-heading text-xl font-black text-white uppercase transition-colors group-hover:text-neon-lime">
            {event.title}
          </h4>
          <p className="mt-1 font-mono text-[10px] tracking-[0.2em] text-neon-lime uppercase">
            Completed · {fmtDate(event.start_date, { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <Link
          href={getHref(event)}
          className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase transition-all hover:translate-x-1 hover:text-neon-lime"
        >
          Details →
        </Link>
        <span className="h-3 w-px bg-white/10" />
        <Link
          href={getHref(event)}
          className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase transition-all hover:translate-x-1 hover:text-neon-violet"
        >
          Recap →
        </Link>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EventsClient({ events = [], settings = {} }) {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('active');
  const [categoryFilter, setCategory] = useState('all');
  const [currentPage, setPage]      = useState(1);
  const [showAllArchive, setShowAll] = useState(false);

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

  const featured = useMemo(() =>
    events.find(e => e.is_featured && ['upcoming','ongoing'].includes(e.status)) ||
    events.find(e => e.is_featured) ||
    events.find(e => ['upcoming','ongoing'].includes(e.status)) ||
    events[0] || null,
  [events]);

  const filtered = useMemo(() => {
    let list = [...events];
    if (statusFilter === 'active')       list = list.filter(e => ['upcoming','ongoing'].includes(e.status));
    else if (statusFilter !== 'all')     list = list.filter(e => e.status === statusFilter);
    if (categoryFilter !== 'all')        list = list.filter(e => e.category === categoryFilter);
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
    events.filter(e => e.status === 'completed')
          .sort((a, b) => new Date(b.start_date||0) - new Date(a.start_date||0)),
  [events]);

  const totalPages  = Math.ceil(filtered.length / PER_PAGE);
  const pageEvents  = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const visibleArchive = showAllArchive ? archive : archive.slice(0, 5);

  const heroTitle = settings?.events_page_title || 'Events & Challenges';
  const heroDesc  = settings?.events_page_description ||
    "Join NEUPC's competitive programming events, technical workshops, and elite hackathons designed to sharpen your edge.";
  const liveCount = counts.upcoming + counts.ongoing;

  function updateStatus(v)   { setStatus(v);   setPage(1); }
  function updateCategory(v) { setCategory(v); setPage(1); }
  function updateSearch(v)   { setSearch(v);   setPage(1); }

  return (
    <div className="overflow-x-clip">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[82vh] items-center overflow-hidden px-4 pt-28 pb-20 sm:px-6 lg:px-8">

        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="grid-overlay absolute inset-0 opacity-30" />
          <div className="absolute -top-32 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-neon-violet/15 blur-[140px]" />
          <div className="absolute top-1/3 right-0 h-[400px] w-[400px] rounded-full bg-neon-lime/10 blur-[140px]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#05060b] to-transparent" />
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mx-auto w-full max-w-screen-xl"
        >
          <div className="max-w-3xl space-y-8">

            {/* Eyebrow */}
            <motion.div variants={fadeUp} className="flex items-center gap-4">
              <span className="pulse-dot bg-neon-lime inline-block h-1.5 w-1.5 rounded-full" />
              <span className="font-mono text-[10px] tracking-[0.35em] text-zinc-400 uppercase sm:text-[11px]">
                {settings?.events_page_badge || 'Events · NEUPC'}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="kinetic-headline font-heading text-[12vw] font-black text-white uppercase select-none md:text-[clamp(3.5rem,8vw,7rem)]"
            >
              {heroTitle.split('&').length > 1 ? (
                <>
                  {heroTitle.split('&')[0].trim()}
                  <br />
                  <span className="neon-text">&amp; {heroTitle.split('&')[1].trim()}</span>
                </>
              ) : (
                <>
                  {heroTitle}
                </>
              )}
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={fadeUp}
              className="max-w-xl text-base leading-relaxed font-light text-zinc-400 sm:text-lg"
            >
              {heroDesc}
            </motion.p>

            {/* Status pill */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-3 rounded-full border border-neon-lime/25 bg-neon-lime/8 px-5 py-2.5 font-mono text-[11px] tracking-[0.2em] text-neon-lime uppercase"
            >
              <span className="pulse-dot bg-neon-lime h-1.5 w-1.5 rounded-full" />
              System Online{liveCount > 0 ? ` · ${liveCount} Event${liveCount > 1 ? 's' : ''} Open` : ' · Standby'}
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/8 pt-8"
            >
              <StatTile value={counts.all}       label="Total Events" />
              <StatTile value={counts.upcoming}  label="Upcoming" accent />
              <StatTile value={counts.ongoing}   label="Live Now" />
              <StatTile value={counts.completed} label="Completed" />
            </motion.div>

          </div>
        </motion.div>

        {/* Scroll indicator */}
        <div className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex">
          <span className="font-mono text-[10px] tracking-[0.4em] text-zinc-700 uppercase">Scroll</span>
          <div className="h-8 w-px bg-gradient-to-b from-zinc-600 to-transparent" />
        </div>
      </section>

      {/* ── Featured ──────────────────────────────────────────────────────── */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-screen-xl space-y-10">

          {/* Section label */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="flex items-end justify-between gap-4"
          >
            <motion.div variants={fadeUp} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="bg-neon-lime h-px w-8" />
                <span className="font-mono text-[10px] tracking-[0.4em] text-neon-lime uppercase sm:text-[11px]">
                  Spotlight / 001
                </span>
              </div>
              <h2 className="kinetic-headline font-heading text-4xl font-black text-white uppercase sm:text-5xl">
                Featured Mission
              </h2>
            </motion.div>
          </motion.div>

          {featured ? (
            <FeaturedBanner event={featured} />
          ) : (
            <div className="ph rounded-2xl p-12 text-center">
              <p className="font-mono text-[11px] tracking-[0.3em] text-zinc-600 uppercase">
                Featured event will appear once published.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Active Operations Grid ─────────────────────────────────────────── */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-screen-xl space-y-10">

          {/* Header row */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
          >
            <motion.div variants={fadeUp} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="bg-neon-lime h-px w-8" />
                <span className="font-mono text-[10px] tracking-[0.4em] text-neon-lime uppercase sm:text-[11px]">
                  Activity Feed / 002
                </span>
              </div>
              <h2 className="kinetic-headline font-heading text-4xl font-black text-white uppercase sm:text-5xl">
                Active Operations
              </h2>
            </motion.div>

            <motion.p variants={fadeUp} className="font-mono text-[11px] tracking-widest text-zinc-600 uppercase">
              {filtered.length} event{filtered.length !== 1 ? 's' : ''} matched
            </motion.p>
          </motion.div>

          {/* Filters */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="glass-panel space-y-4 rounded-2xl p-4 sm:p-5"
          >
            {/* Search + category */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={search}
                onChange={e => updateSearch(e.target.value)}
                placeholder="Search events, locations, categories…"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 transition focus:border-neon-lime/30 focus:bg-white/8"
              />
              {categories.length > 2 && (
                <select
                  value={categoryFilter}
                  onChange={e => updateCategory(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-neon-lime/30 sm:min-w-44"
                >
                  {categories.map(c => (
                    <option key={c} value={c} className="bg-[#0c0e16]">
                      {c === 'all' ? 'All Categories' : c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Status tabs */}
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map(tab => {
                const active = statusFilter === tab.key;
                const count  = counts[tab.key] ?? counts.all;
                return (
                  <button
                    key={tab.key}
                    onClick={() => updateStatus(tab.key)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[10px] font-bold tracking-widest uppercase transition-all',
                      active
                        ? 'bg-neon-lime text-black shadow-[0_0_20px_-5px_rgba(182,243,107,0.5)]'
                        : 'border border-white/10 text-zinc-500 hover:border-neon-lime/30 hover:text-neon-lime'
                    )}
                  >
                    {tab.label}
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 text-[9px]',
                      active ? 'bg-black/20' : 'bg-white/10'
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Cards */}
          {pageEvents.length > 0 ? (
            <>
              <motion.div
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
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
                onPageChange={setPage}
                itemLabel="event"
              />
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={viewport}
              className="ph flex flex-col items-center gap-4 rounded-2xl py-24 text-center"
            >
              <div className="font-mono text-4xl opacity-20">[ ]</div>
              <p className="font-mono text-[11px] tracking-[0.3em] text-zinc-600 uppercase">
                No events match your filters.
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Archive ───────────────────────────────────────────────────────── */}
      {archive.length > 0 && (
        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-screen-xl">

            {/* Header */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
              className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
            >
              <motion.div variants={fadeUp} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="bg-neon-lime h-px w-8" />
                  <span className="font-mono text-[10px] tracking-[0.4em] text-neon-lime uppercase sm:text-[11px]">
                    Archive / 003
                  </span>
                </div>
                <h2 className="kinetic-headline font-heading text-4xl font-black text-white uppercase sm:text-5xl">
                  Log History
                </h2>
              </motion.div>
              <motion.p variants={fadeUp} className="font-mono text-[11px] tracking-widest text-zinc-600 uppercase">
                {archive.length} completed
              </motion.p>
            </motion.div>

            {/* Archive list */}
            <motion.div
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
              className="border-t border-white/5"
            >
              {visibleArchive.map((event, i) => (
                <motion.div key={event.id} variants={cardReveal}>
                  <ArchiveRow event={event} index={i} />
                </motion.div>
              ))}
            </motion.div>

            {archive.length > 5 && (
              <div className="mt-12 text-center">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAll(v => !v)}
                  className="rounded-full border border-white/15 px-10 py-3.5 font-heading text-[11px] font-bold tracking-widest text-zinc-400 uppercase transition-all hover:border-neon-lime/40 hover:text-neon-lime"
                >
                  {showAllArchive ? 'Collapse Archive' : `Load Full Archive (${archive.length})`}
                </motion.button>
              </div>
            )}
          </div>
        </section>
      )}

      <ScrollToTop />
    </div>
  );
}
