'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import SafeImg from '../_components/ui/SafeImg';
import InlinePagination from '../_components/ui/InlinePagination';
import FeaturedCarousel from '../_components/ui/FeaturedCarousel';
import { cn, driveImageUrl } from '../_lib/utils';
import { getCategoryLabel } from '../_lib/blog-config';

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

const CATEGORIES = [
  { key: 'CP',          label: 'Competitive Programming' },
  { key: 'Programming', label: 'Programming' },
  { key: 'WebDev',      label: 'Web Dev' },
  { key: 'AI-ML',       label: 'AI / ML' },
  { key: 'Career',      label: 'Career' },
  { key: 'News',        label: 'News' },
  { key: 'Tutorial',    label: 'Tutorial' },
  { key: 'Other',       label: 'Other' },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'popular', label: 'Most Views' },
  { key: 'title',   label: 'Title A–Z' },
];

const PER_PAGE = 9;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeBlog(b) {
  const authorObj = b.users || {};
  return {
    ...b,
    excerpt: b.excerpt || '',
    author: authorObj.full_name || 'NEUPC Team',
    authorAvatar: authorObj.avatar_url || null,
    thumbnail: b.thumbnail || null,
    date: b.published_at
      ? new Date(b.published_at).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        })
      : '',
    readTime: b.read_time || '5 min',
    tags: Array.isArray(b.tags) ? b.tags : [],
    featured: b.is_featured ?? false,
    views: b.views ?? 0,
  };
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

// ─── Section eyebrow (exact pattern from achievements page) ──────────────────

function SectionEyebrow({ tag, title, accent, right }) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      className={cn(
        'mb-8 flex flex-col gap-1 sm:mb-10',
        right && 'sm:flex-row sm:items-end sm:justify-between'
      )}
    >
      <div>
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <span className="bg-neon-lime h-px w-7" />
          <span className="font-mono text-[10px] tracking-[0.35em] text-neon-lime uppercase sm:text-[11px]">
            {tag}
          </span>
        </motion.div>
        <motion.h2
          variants={fadeUp}
          className="kinetic-headline mt-2 font-heading text-3xl font-black text-white uppercase sm:text-4xl"
        >
          {title}
          {accent && <> <span className="neon-text">{accent}</span></>}
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

function FeaturedBanner({ blog }) {
  const image = blog.thumbnail ? driveImageUrl(blog.thumbnail) : null;

  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      className="group relative overflow-hidden rounded-2xl border border-white/8 bg-[#08090f] shadow-[0_0_0_1px_rgba(182,243,107,0.06),0_32px_64px_-16px_rgba(0,0,0,0.7)]"
    >
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-lime/60 to-transparent z-10" />

      {/* Cover */}
      <div className="relative aspect-[3/2] w-full overflow-hidden sm:aspect-[16/8]">
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
            alt={blog.title || 'Featured post'}
            className="absolute inset-0 h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="h-16 w-16 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#08090f] to-transparent" />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-lime/25 bg-black/60 px-3 py-1 font-mono text-[9px] font-bold tracking-[0.2em] text-neon-lime uppercase backdrop-blur-xl sm:text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-lime shadow-[0_0_6px_2px_rgba(182,243,107,0.7)]" />
            Featured
          </span>
          {blog.category && (
            <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 font-mono text-[9px] font-bold tracking-[0.2em] text-zinc-300 uppercase backdrop-blur-xl sm:text-[10px]">
              {getCategoryLabel(blog.category)}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-6 px-6 pb-7 sm:-mt-8 sm:px-8 sm:pb-9 lg:px-10 lg:pb-10">
        {/* Meta */}
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {blog.date && (
            <span className="font-mono text-[10px] tracking-[0.25em] text-neon-lime uppercase sm:text-[11px]">
              {blog.date}
            </span>
          )}
          {blog.readTime && (
            <>
              <span className="h-3 w-px bg-white/15" />
              <span className="font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase sm:text-[11px]">
                {blog.readTime} read
              </span>
            </>
          )}
        </div>

        <h3 className="kinetic-headline font-heading text-[1.6rem] font-black leading-[1.05] text-white uppercase sm:text-4xl lg:text-5xl">
          {blog.title}
        </h3>

        <div className="mt-4 h-px w-12 bg-neon-lime/50 sm:mt-5" />

        {blog.excerpt && (
          <p className="mt-4 max-w-2xl text-sm leading-[1.75] text-zinc-400 sm:mt-5 sm:text-[15px]">
            {blog.excerpt.length > 220 ? `${blog.excerpt.slice(0, 220).trim()}…` : blog.excerpt}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4 sm:mt-7">
          <Link
            href={`/blogs/${blog.slug || blog.id}`}
            className="group/cta inline-flex min-h-[44px] items-center gap-2.5 rounded-full bg-neon-lime px-7 py-3 font-heading text-[10px] font-bold tracking-[0.18em] text-black uppercase shadow-[0_0_24px_-4px_rgba(182,243,107,0.5)] transition-all duration-300 hover:shadow-[0_0_40px_-2px_rgba(182,243,107,0.75)] hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-lime focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090f] sm:text-[11px]"
          >
            Read Article
            <span className="transition-transform duration-300 group-hover/cta:translate-x-1">→</span>
          </Link>

          {blog.author && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neon-lime/25 bg-neon-lime/10 font-heading text-[11px] font-black text-neon-lime shadow-[0_0_12px_-2px_rgba(182,243,107,0.3)]">
                {blog.author.charAt(0).toUpperCase()}
              </div>
              <span className="font-mono text-[10px] tracking-wider text-zinc-400 sm:text-[11px]">
                {blog.author}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

// ─── Blog card (holographic-card pattern from homepage / events) ──────────────

function BlogCard({ blog }) {
  const image = blog.thumbnail ? driveImageUrl(blog.thumbnail) : null;

  return (
    <motion.div variants={cardReveal} whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
      <Link
        href={`/blogs/${blog.slug || blog.id}`}
        className="group flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-lime focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060b]"
      >
        {/* Cover */}
        <div className="relative mb-4 w-full overflow-hidden rounded-xl border border-white/8 aspect-[16/9] bg-white/3 shadow-sm transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-black/40">
          {image ? (
            <SafeImg
              src={image}
              alt={blog.title || ''}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-zinc-700">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Category pill */}
          {blog.category && (
            <div className="absolute top-2.5 left-2.5 rounded-full bg-neon-lime/90 px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-black uppercase backdrop-blur-sm">
              {getCategoryLabel(blog.category)}
            </div>
          )}

          {/* Featured badge */}
          {blog.featured && (
            <div className="absolute top-2.5 right-2.5 rounded-full border border-neon-lime/30 bg-neon-lime/10 px-2 py-0.5 font-mono text-[9px] font-bold tracking-widest text-neon-lime uppercase backdrop-blur-sm">
              Featured
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex flex-1 flex-col gap-2 px-0.5">
          <h3 className="font-heading text-base font-black leading-snug text-white transition-colors duration-200 group-hover:text-neon-lime sm:text-lg line-clamp-2">
            {blog.title}
          </h3>
          {blog.excerpt && (
            <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500 sm:text-sm">
              {blog.excerpt}
            </p>
          )}
          {blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {blog.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-zinc-600">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-white/5 pt-3 font-mono text-[9px] tracking-wider text-zinc-600 uppercase sm:text-[10px]">
            <span className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 font-heading text-[10px] font-black text-white">
                {blog.author.charAt(0)}
              </div>
              <span className="truncate max-w-[100px]">{blog.author}</span>
            </span>
            {blog.date && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-white/20" />
                <span>{blog.date}</span>
              </>
            )}
            {blog.readTime && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-white/20" />
                <span>{blog.readTime}</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BlogsClient({ initialBlogs = [], settings = {} }) {
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy]     = useState('newest');
  const [currentPage, setPage]  = useState(1);
  const gridRef = useRef(null);

  const blogs        = useMemo(() => initialBlogs.map(normalizeBlog), [initialBlogs]);
  const featuredBlogs = useMemo(() => blogs.filter((b) => b.featured), [blogs]);

  const counts = useMemo(() => {
    const map = { all: blogs.length };
    CATEGORIES.forEach(({ key }) => { map[key] = blogs.filter((b) => b.category === key).length; });
    return map;
  }, [blogs]);

  const filtered = useMemo(() => {
    let list = blogs;
    if (category) list = list.filter((b) => b.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.title?.toLowerCase().includes(q) ||
          b.excerpt?.toLowerCase().includes(q) ||
          b.author?.toLowerCase().includes(q) ||
          b.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.published_at) - new Date(b.published_at);
      if (sortBy === 'popular') return (b.views ?? 0) - (a.views ?? 0);
      if (sortBy === 'title')   return (a.title ?? '').localeCompare(b.title ?? '');
      return new Date(b.published_at) - new Date(a.published_at);
    });
  }, [blogs, category, search, sortBy]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageBlogs  = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const hasFilters = !!(search || category);

  const activeFilterCount =
    (search.trim() ? 1 : 0) + (category ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0);

  const scrollToGrid = useCallback(() => {
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  function changePage(p) { setPage(p); setTimeout(scrollToGrid, 50); }
  function handleCategory(cat) { setCategory((p) => (p === cat ? '' : cat)); setPage(1); }
  function handleSearch(e)   { setSearch(e.target.value); setPage(1); }
  function clearAll()        { setSearch(''); setCategory(''); setSortBy('newest'); setPage(1); }

  const heroTitle = settings?.blogs_page_title || 'Engineering Logs';
  const heroDesc  = settings?.blogs_page_description ||
    'Tutorials, contest insights, career guidance, and community stories from NEUPC members and mentors.';

  // Collect all unique tags from published blogs
  const allTags = useMemo(() =>
    Array.from(new Set(blogs.flatMap((b) => b.tags))).slice(0, 24),
  [blogs]);

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
                {settings?.blogs_page_badge || 'Knowledge Hub · NEUPC'}
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
              ) : (
                <>
                  {heroTitle}
                </>
              )}
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={fadeUp}
              className="max-w-lg text-sm leading-relaxed text-zinc-400 sm:max-w-xl sm:text-base lg:text-lg"
            >
              {heroDesc}
            </motion.p>

            {/* Article count pill */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2.5 rounded-full border border-neon-lime/20 bg-neon-lime/8 px-4 py-2 font-mono text-[10px] tracking-[0.18em] text-neon-lime uppercase sm:px-5 sm:py-2.5 sm:text-[11px]"
            >
              <span className="pulse-dot bg-neon-lime h-1.5 w-1.5 rounded-full" />
              {blogs.length > 0
                ? `${blogs.length} Article${blogs.length !== 1 ? 's' : ''} Published`
                : 'New Articles Coming Soon'}
            </motion.div>

            {/* Stats row */}
            <motion.div variants={fadeUp} className="border-t border-white/8 pt-6 sm:pt-8">
              <div className="grid grid-cols-4 divide-x divide-white/8">
                <div className="pr-3 sm:pr-6 lg:pr-8">
                  <StatTile value={blogs.length}         label="Total Articles" mobileLabel="Total" />
                </div>
                <div className="px-3 sm:px-6 lg:px-8">
                  <StatTile value={featuredBlogs.length} label="Featured"       accent />
                </div>
                <div className="px-3 sm:px-6 lg:px-8">
                  <StatTile value={counts['Tutorial'] ?? 0} label="Tutorials"  mobileLabel="Tuts" />
                </div>
                <div className="pl-3 sm:pl-6 lg:pl-8">
                  <StatTile value={counts['CP'] ?? 0}    label="CP Articles"   mobileLabel="CP" />
                </div>
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

      {/* ── Featured article ──────────────────────────────────────────────── */}
      {featuredBlogs.length > 0 && (
        <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-7 sm:space-y-9">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={viewport}>
              <motion.div variants={fadeUp} className="flex items-center gap-3">
                <span className="bg-neon-lime h-px w-7" />
                <span className="font-mono text-[10px] tracking-[0.35em] text-neon-lime uppercase sm:text-[11px]">
                  {featuredBlogs.length > 1 ? 'Featured Articles' : 'Featured Article'}
                </span>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="kinetic-headline mt-2 font-heading text-3xl font-black text-white uppercase sm:text-4xl"
              >
                Editor&apos;s Pick{featuredBlogs.length > 1 ? 's' : ''}
              </motion.h2>
            </motion.div>
            <FeaturedCarousel
              items={featuredBlogs}
              ariaLabel="Featured articles"
              getKey={(b) => b.id ?? b.slug ?? b.title}
              renderItem={(blog) => <FeaturedBanner blog={blog} />}
            />
          </div>
        </section>
      )}

      {/* ── All articles grid ─────────────────────────────────────────────── */}
      <section
        ref={gridRef}
        className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        style={{ scrollMarginTop: '80px' }}
      >
        <div className="mx-auto max-w-7xl space-y-8 sm:space-y-10">

          <SectionEyebrow
            tag="Browse Articles"
            title="All Posts"
            right={`${filtered.length} article${filtered.length !== 1 ? 's' : ''}`}
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
              {/* Search */}
              <div className="relative flex-1">
                <svg className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={handleSearch}
                  placeholder="Search articles, authors, tags…"
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

              {/* Sort */}
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

            {/* Category tabs + clear */}
            <div className="flex items-center gap-2">
              <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-none">
                {/* All tab */}
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
                  <span className={cn(
                    'rounded-full px-1.5 py-px text-[9px] tabular-nums',
                    !category ? 'bg-black/20' : 'bg-white/10'
                  )}>
                    {counts.all}
                  </span>
                </button>

                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => handleCategory(cat.key)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase transition-all',
                      category === cat.key
                        ? 'bg-neon-lime text-black shadow-[0_0_16px_-4px_rgba(182,243,107,0.5)]'
                        : 'border border-white/10 text-zinc-500 hover:border-neon-lime/30 hover:text-neon-lime'
                    )}
                  >
                    {cat.label}
                    <span className={cn(
                      'rounded-full px-1.5 py-px text-[9px] tabular-nums',
                      category === cat.key ? 'bg-black/20' : 'bg-white/10'
                    )}>
                      {counts[cat.key] ?? 0}
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
          {pageBlogs.length > 0 ? (
            <>
              <motion.div
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3"
              >
                {pageBlogs.map((blog) => (
                  <BlogCard key={blog.id} blog={blog} />
                ))}
              </motion.div>

              <InlinePagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={filtered.length}
                perPage={PER_PAGE}
                onPageChange={changePage}
                itemLabel="article"
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
                {hasFilters ? 'No articles found' : 'No articles yet'}
              </p>
              <p className="font-mono text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
                {hasFilters
                  ? 'Try different keywords or clear your filters'
                  : 'Blog posts will appear here once published'}
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

      {/* ── Tags cloud ───────────────────────────────────────────────────── */}
      {allTags.length > 0 && (
        <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionEyebrow tag="Explore Topics" title="Popular Tags" />
            <motion.div
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
              className="flex flex-wrap gap-3"
            >
              {allTags.map((tag) => (
                <motion.button
                  key={tag}
                  variants={cardReveal}
                  onClick={() => { setSearch(tag); setPage(1); scrollToGrid(); }}
                  className="rounded-full border border-white/10 bg-white/3 px-5 py-2.5 font-mono text-[10px] tracking-wider text-zinc-500 uppercase transition-all hover:border-neon-lime/30 hover:bg-neon-lime/5 hover:text-neon-lime"
                >
                  #{tag}
                </motion.button>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="glass-panel relative overflow-hidden rounded-2xl p-10 sm:p-16 flex flex-col lg:flex-row items-center justify-between gap-10"
          >
            {/* Glow accent */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-neon-lime/10 blur-[80px]" />

            <div className="relative z-10 text-center lg:text-left">
              <div className="mb-3 flex items-center justify-center gap-3 lg:justify-start">
                <span className="bg-neon-lime h-px w-7" />
                <span className="font-mono text-[10px] tracking-[0.35em] text-neon-lime uppercase sm:text-[11px]">
                  Write For Us
                </span>
              </div>
              <h3 className="kinetic-headline font-heading text-3xl font-black text-white uppercase sm:text-4xl">
                {settings?.blogs_page_cta_title || (
                  <>Share Your <span className="neon-text">Knowledge</span></>
                )}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
                {settings?.blogs_page_cta_description ||
                  'Are you a member with insights to share? Contribute a tutorial, contest editorial, or career story to the community.'}
              </p>
            </div>

            <div className="relative z-10 flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/join"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-neon-lime px-8 py-3.5 font-heading text-[10px] font-bold tracking-widest text-black uppercase shadow-[0_0_30px_-8px_rgba(182,243,107,0.6)] transition-shadow hover:shadow-[0_0_50px_-4px_rgba(182,243,107,0.8)] sm:text-[11px]"
              >
                Join the Club →
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
