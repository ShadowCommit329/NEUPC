'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import SafeImg from '@/app/_components/ui/SafeImg';
import InlinePagination from '@/app/_components/ui/InlinePagination';
import { cn, driveImageUrl } from '@/app/_lib/utils';

const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), {
  ssr: false,
});

// ─── Motion variants (synced with events + achievements pages) ────────────────

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
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const viewport = { once: true, margin: '-40px 0px' };

// ─── Constants ────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: 'newest',  label: 'Newest First' },
  { key: 'oldest',  label: 'Oldest First' },
  { key: 'popular', label: 'Most Views' },
  { key: 'title',   label: 'Title A–Z' },
];

const DIFFICULTY_ORDER = { beginner: 1, intermediate: 2, advanced: 3 };

const PER_PAGE = 9;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_ICON_MAP = {
  'Competitive Programming': '🏆',
  'Data Structures': '🌲',
  'Algorithms': '⚙️',
  'Mathematics': '∑',
  'Web Development': '🌐',
  'Machine Learning': '🤖',
  'System Design': '🏗️',
  'Programming Languages': '💻',
  'Problem Solving': '🧠',
};

function getCategoryIcon(cat) {
  if (!cat) return '📚';
  if (CATEGORY_ICON_MAP[cat]) return CATEGORY_ICON_MAP[cat];
  const icons = ['💡', '🚀', '🎯', '✨', '🔥', '⚡'];
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  return icons[Math.abs(hash) % icons.length];
}

function normalizeRoadmap(r) {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title || 'Untitled',
    category: r.category || 'General',
    difficulty: (r.difficulty || 'beginner').toLowerCase(),
    level: r.difficulty
      ? r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1)
      : 'Beginner',
    description: r.description || '',
    duration: r.estimated_duration || '',
    thumbnail: r.thumbnail || null,
    views: r.views ?? 0,
    created_at: r.created_at,
    is_featured: r.is_featured ?? false,
  };
}

function computeCategories(roadmaps) {
  const counts = {};
  roadmaps.forEach((r) => { const c = r.category; counts[c] = (counts[c] || 0) + 1; });
  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── Difficulty badge ─────────────────────────────────────────────────────────

const DIFF_CONFIG = {
  beginner:     { label: 'Beginner',     dot: 'bg-neon-lime',   text: 'text-neon-lime',   border: 'border-neon-lime/25',   bg: 'bg-neon-lime/8'    },
  intermediate: { label: 'Intermediate', dot: 'bg-amber-400',   text: 'text-amber-300',   border: 'border-amber-400/25',   bg: 'bg-amber-400/8'    },
  advanced:     { label: 'Advanced',     dot: 'bg-neon-violet', text: 'text-neon-violet', border: 'border-neon-violet/30', bg: 'bg-neon-violet/10'  },
};

function DifficultyBadge({ difficulty }) {
  const c = DIFF_CONFIG[difficulty] || DIFF_CONFIG.beginner;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.18em] uppercase',
      c.bg, c.border, c.text
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />
      {c.label}
    </span>
  );
}

// ─── Stat tile (exact pattern from events + achievements) ─────────────────────

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

// ─── Section eyebrow (exact pattern from events page) ────────────────────────

function SectionEyebrow({ tag, title, accent, right }) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      className={cn('mb-8 flex flex-col gap-1 sm:mb-10', right && 'sm:flex-row sm:items-end sm:justify-between')}
    >
      <div>
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <span className="bg-neon-lime h-px w-7" />
          <span className="font-mono text-[10px] tracking-[0.35em] text-neon-lime uppercase sm:text-[11px]">{tag}</span>
        </motion.div>
        <motion.h2 variants={fadeUp} className="kinetic-headline mt-2 font-heading text-3xl font-black text-white uppercase sm:text-4xl">
          {title}{accent && <> <span className="neon-text">{accent}</span></>}
        </motion.h2>
      </div>
      {right && (
        <motion.p variants={fadeUp} className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase sm:text-[11px]">
          {right}
        </motion.p>
      )}
    </motion.div>
  );
}

// ─── Featured banner (same split-panel pattern as events page) ────────────────

function FeaturedBanner({ roadmap }) {
  const image = roadmap.thumbnail ? driveImageUrl(roadmap.thumbnail) : null;
  const icon = getCategoryIcon(roadmap.category);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      className="glass-panel overflow-hidden rounded-2xl border border-neon-lime/10"
    >
      <div className="grid lg:grid-cols-2">
        {/* Image panel */}
        <div className="relative min-h-56 sm:min-h-72 lg:min-h-[400px]">
          {image ? (
            <SafeImg
              src={image}
              alt={roadmap.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-white/3 text-6xl text-zinc-700">
              {icon}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#05060b]/80 via-[#05060b]/10 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[#05060b]/10 lg:to-[#05060b]/90" />

          {/* Category badge */}
          {roadmap.category && (
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 rounded-full border border-neon-lime/30 bg-neon-lime/10 px-3 py-1 font-mono text-[9px] font-bold tracking-widest text-neon-lime uppercase backdrop-blur-md sm:text-[10px]">
              {roadmap.category}
            </div>
          )}
          {/* Featured badge */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 rounded-full bg-neon-lime/90 px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-black uppercase backdrop-blur-sm">
            Featured
          </div>
        </div>

        {/* Content panel */}
        <div className="flex flex-col justify-center gap-4 p-6 sm:gap-5 sm:p-8 lg:p-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-neon-lime/30 bg-neon-lime/10 px-3 py-0.5 font-mono text-[9px] font-bold tracking-widest text-neon-lime uppercase sm:text-[10px]">
              Priority Core Path
            </span>
            {roadmap.duration && (
              <span className="font-mono text-[10px] tracking-wider text-zinc-500">
                ⏱ {roadmap.duration}
              </span>
            )}
          </div>

          <h3 className="kinetic-headline font-heading text-2xl font-black leading-tight text-white uppercase sm:text-3xl lg:text-4xl">
            {roadmap.title}
          </h3>

          {roadmap.description && (
            <p className="line-clamp-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
              {roadmap.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <DifficultyBadge difficulty={roadmap.difficulty} />
          </div>

          <div className="pt-1">
            <Link
              href={`/roadmaps/${roadmap.slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-neon-lime px-6 py-3 font-heading text-[10px] font-bold tracking-widest text-black uppercase shadow-[0_0_30px_-8px_rgba(182,243,107,0.6)] transition-shadow hover:shadow-[0_0_50px_-4px_rgba(182,243,107,0.8)] sm:px-8 sm:py-3.5 sm:text-[11px]"
            >
              Explore Roadmap →
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Roadmap card (holographic-card pattern from events page) ─────────────────

function RoadmapCard({ roadmap }) {
  const icon = getCategoryIcon(roadmap.category);
  const image = roadmap.thumbnail ? driveImageUrl(roadmap.thumbnail) : null;

  return (
    <motion.div variants={cardReveal} whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
      <Link
        href={`/roadmaps/${roadmap.slug}`}
        className="group flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-lime focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060b]"
      >
        {/* Cover */}
        <div className="relative mb-4 w-full overflow-hidden rounded-xl border border-white/8 aspect-video bg-white/3 shadow-sm transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-black/40">
          {image ? (
            <SafeImg
              src={image}
              alt={roadmap.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-zinc-700 text-5xl">
              {icon}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Category pill */}
          {roadmap.category && (
            <div className="absolute top-2.5 left-2.5 rounded-full bg-neon-lime/90 px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-black uppercase backdrop-blur-sm">
              {roadmap.category}
            </div>
          )}

          {/* Featured badge */}
          {roadmap.is_featured && (
            <div className="absolute top-2.5 right-2.5 rounded-full border border-neon-lime/30 bg-neon-lime/10 px-2 py-0.5 font-mono text-[9px] font-bold tracking-widest text-neon-lime uppercase backdrop-blur-sm">
              Featured
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex flex-1 flex-col gap-2 px-0.5">
          <h3 className="font-heading text-base font-black leading-snug text-white transition-colors duration-200 group-hover:text-neon-lime sm:text-lg line-clamp-2">
            {roadmap.title}
          </h3>
          {roadmap.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500 sm:text-sm">
              {roadmap.description}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-white/5 pt-3 font-mono text-[9px] tracking-wider text-zinc-600 uppercase sm:text-[10px]">
            <DifficultyBadge difficulty={roadmap.difficulty} />
            {roadmap.duration && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-white/20" />
                <span>⏱ {roadmap.duration}</span>
              </>
            )}
            {roadmap.views > 0 && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-white/20" />
                <span>{roadmap.views} views</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RoadmapsClient({ roadmaps: propRoadmaps = [], settings = {} }) {
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [sortBy, setSortBy]         = useState('newest');
  const [currentPage, setPage]      = useState(1);
  const gridRef = useRef(null);

  const roadmaps = useMemo(() => propRoadmaps.map(normalizeRoadmap), [propRoadmaps]);
  const featuredRoadmaps = useMemo(() => roadmaps.filter((r) => r.is_featured), [roadmaps]);
  const categories = useMemo(() => computeCategories(roadmaps), [roadmaps]);

  const difficultyTabs = useMemo(() => {
    const levels = new Set(roadmaps.map((r) => r.difficulty));
    const sorted = Array.from(levels).sort((a, b) => (DIFFICULTY_ORDER[a] || 99) - (DIFFICULTY_ORDER[b] || 99));
    return [{ id: 'all', label: 'All Paths' }, ...sorted.map((d) => ({
      id: d,
      label: d === 'beginner' ? 'Beginner' : d.charAt(0).toUpperCase() + d.slice(1),
    }))];
  }, [roadmaps]);

  const counts = useMemo(() => {
    const map = { all: roadmaps.length };
    categories.forEach(({ category: c, count }) => { map[c] = count; });
    return map;
  }, [roadmaps, categories]);

  const featuredCount = featuredRoadmaps.length;
  const beginnerCount = useMemo(() => roadmaps.filter((r) => r.difficulty === 'beginner').length, [roadmaps]);

  const filtered = useMemo(() => {
    let list = roadmaps;
    if (difficulty !== 'all') list = list.filter((r) => r.difficulty === difficulty);
    if (category) list = list.filter((r) => r.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'oldest')  return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (sortBy === 'popular') return (b.views ?? 0) - (a.views ?? 0);
      if (sortBy === 'title')   return a.title.localeCompare(b.title);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [roadmaps, difficulty, category, search, sortBy]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems  = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const hasFilters = !!(search || category || difficulty !== 'all');
  const activeFilterCount =
    (search.trim() ? 1 : 0) + (category ? 1 : 0) + (difficulty !== 'all' ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0);

  const scrollToGrid = useCallback(() => {
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  function changePage(p) { setPage(p); setTimeout(scrollToGrid, 50); }
  function handleCategory(c) { setCategory((p) => (p === c ? '' : c)); setPage(1); }
  function handleSearch(e) { setSearch(e.target.value); setPage(1); }
  function clearAll() { setSearch(''); setCategory(''); setDifficulty('all'); setSortBy('newest'); setPage(1); }

  const heroTitle = settings?.roadmaps_page_title || 'Learning Roadmaps';
  const heroDesc  = settings?.roadmaps_page_description ||
    "Follow clear, stage-by-stage learning paths curated to help you build practical skills in competitive programming, web development, and more.";

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
                {settings?.roadmaps_page_badge || 'Roadmap Library · NEUPC'}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="kinetic-headline font-heading text-[clamp(2.8rem,11vw,7rem)] font-black leading-none text-white uppercase select-none"
            >
              {heroTitle.includes('&') ? (
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

            {/* Roadmap count pill */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2.5 rounded-full border border-neon-lime/20 bg-neon-lime/8 px-4 py-2 font-mono text-[10px] tracking-[0.18em] text-neon-lime uppercase sm:px-5 sm:py-2.5 sm:text-[11px]"
            >
              <span className="pulse-dot bg-neon-lime h-1.5 w-1.5 rounded-full" />
              {roadmaps.length > 0
                ? `${roadmaps.length} Roadmap${roadmaps.length !== 1 ? 's' : ''} Available`
                : 'Roadmaps Coming Soon'}
            </motion.div>

            {/* Stats row */}
            <motion.div variants={fadeUp} className="border-t border-white/8 pt-6 sm:pt-8">
              <div className="grid grid-cols-4 divide-x divide-white/8">
                <div className="pr-3 sm:pr-6 lg:pr-8">
                  <StatTile value={roadmaps.length}   label="Roadmaps"         mobileLabel="Total" />
                </div>
                <div className="px-3 sm:px-6 lg:px-8">
                  <StatTile value={categories.length} label="Domains"          accent />
                </div>
                <div className="px-3 sm:px-6 lg:px-8">
                  <StatTile value={featuredCount}     label="Featured"         mobileLabel="Picks" />
                </div>
                <div className="pl-3 sm:pl-6 lg:pl-8">
                  <StatTile value={beginnerCount}     label="Beginner Friendly" mobileLabel="Beginner" />
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

      {/* ── Featured roadmap ──────────────────────────────────────────────── */}
      {featuredRoadmaps.length > 0 && (
        <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <div className="mx-auto max-w-screen-xl space-y-7 sm:space-y-9">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={viewport}>
              <motion.div variants={fadeUp} className="flex items-center gap-3">
                <span className="bg-neon-lime h-px w-7" />
                <span className="font-mono text-[10px] tracking-[0.35em] text-neon-lime uppercase sm:text-[11px]">
                  Featured Roadmap
                </span>
              </motion.div>
              <motion.h2 variants={fadeUp} className="kinetic-headline mt-2 font-heading text-3xl font-black text-white uppercase sm:text-4xl">
                Don&apos;t Miss This
              </motion.h2>
            </motion.div>
            <FeaturedBanner roadmap={featuredRoadmaps[0]} />
          </div>
        </section>
      )}

      {/* ── All roadmaps grid ─────────────────────────────────────────────── */}
      <section
        ref={gridRef}
        className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        style={{ scrollMarginTop: '80px' }}
      >
        <div className="mx-auto max-w-screen-xl space-y-8 sm:space-y-10">

          <SectionEyebrow
            tag="Browse Roadmaps"
            title="All Paths"
            right={`${filtered.length} path${filtered.length !== 1 ? 's' : ''}`}
          />

          {/* Filters panel */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="glass-panel space-y-3 rounded-2xl p-3 sm:p-4"
          >
            {/* Search + sort row */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <svg className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={handleSearch}
                  placeholder="Search roadmaps, categories…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-9 text-sm text-white outline-none placeholder:text-zinc-600 transition focus:border-neon-lime/30 focus:bg-white/8"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(''); setPage(1); }}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-0.5 text-zinc-500 transition-colors hover:text-white"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-[10px] tracking-wider text-zinc-300 uppercase outline-none transition focus:border-neon-lime/30 cursor-pointer sm:min-w-40"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Difficulty tabs */}
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-none">
              {difficultyTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setDifficulty(tab.id); setPage(1); }}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase transition-all',
                    difficulty === tab.id
                      ? 'bg-neon-lime text-black shadow-[0_0_16px_-4px_rgba(182,243,107,0.5)]'
                      : 'border border-white/10 text-zinc-500 hover:border-neon-lime/30 hover:text-neon-lime'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Category tabs + clear */}
            <div className="flex items-center gap-2">
              <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-none">
                <button
                  onClick={() => { setCategory(''); setPage(1); }}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase transition-all',
                    !category
                      ? 'bg-neon-lime text-black shadow-[0_0_16px_-4px_rgba(182,243,107,0.5)]'
                      : 'border border-white/10 text-zinc-500 hover:border-neon-lime/30 hover:text-neon-lime'
                  )}
                >
                  All
                  <span className={cn('rounded-full px-1.5 py-px text-[9px] tabular-nums', !category ? 'bg-black/20' : 'bg-white/10')}>
                    {counts.all}
                  </span>
                </button>

                {categories.map(({ category: cat, count }) => (
                  <button
                    key={cat}
                    onClick={() => handleCategory(cat)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase transition-all',
                      category === cat
                        ? 'bg-neon-lime text-black shadow-[0_0_16px_-4px_rgba(182,243,107,0.5)]'
                        : 'border border-white/10 text-zinc-500 hover:border-neon-lime/30 hover:text-neon-lime'
                    )}
                  >
                    {getCategoryIcon(cat)} {cat}
                    <span className={cn('rounded-full px-1.5 py-px text-[9px] tabular-nums', category === cat ? 'bg-black/20' : 'bg-white/10')}>
                      {count}
                    </span>
                  </button>
                ))}
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
          {pageItems.length > 0 ? (
            <>
              <motion.div
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3"
              >
                {pageItems.map((roadmap) => (
                  <RoadmapCard key={roadmap.id} roadmap={roadmap} />
                ))}
              </motion.div>

              <InlinePagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={filtered.length}
                perPage={PER_PAGE}
                onPageChange={changePage}
                itemLabel="roadmap"
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
              <p className="font-heading text-base font-bold text-white sm:text-lg">
                {hasFilters ? 'No roadmaps found' : 'No roadmaps yet'}
              </p>
              <p className="font-mono text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
                {hasFilters
                  ? 'Try different keywords or clear your filters'
                  : 'Roadmaps will appear here once published'}
              </p>
              {hasFilters && (
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

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-screen-xl">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="glass-panel relative overflow-hidden rounded-2xl p-10 sm:p-16 flex flex-col lg:flex-row items-center justify-between gap-10"
          >
            <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-neon-lime/10 blur-[80px]" />

            <div className="relative z-10 text-center lg:text-left">
              <div className="mb-3 flex items-center justify-center gap-3 lg:justify-start">
                <span className="bg-neon-lime h-px w-7" />
                <span className="font-mono text-[10px] tracking-[0.35em] text-neon-lime uppercase sm:text-[11px]">
                  Ready to Learn
                </span>
              </div>
              <h3 className="kinetic-headline font-heading text-3xl font-black text-white uppercase sm:text-4xl">
                {settings?.roadmaps_page_cta_title || (
                  <>Start Your <span className="neon-text">Journey</span></>
                )}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
                {settings?.roadmaps_page_cta_description ||
                  'Join NEUPC and get guidance from experienced mentors on your chosen roadmap. Build real skills, compete at the top level.'}
              </p>
            </div>

            <div className="relative z-10 flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/join"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-neon-lime px-8 py-3.5 font-heading text-[10px] font-bold tracking-widest text-black uppercase shadow-[0_0_30px_-8px_rgba(182,243,107,0.6)] transition-shadow hover:shadow-[0_0_50px_-4px_rgba(182,243,107,0.8)] sm:text-[11px]"
              >
                Join NEUPC →
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-8 py-3.5 font-heading text-[10px] font-bold tracking-widest text-zinc-400 uppercase transition-all hover:border-neon-lime/35 hover:text-neon-lime sm:text-[11px]"
              >
                Contact Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <ScrollToTop />
    </div>
  );
}
