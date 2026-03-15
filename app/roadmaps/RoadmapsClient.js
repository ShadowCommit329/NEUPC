/**
 * @file Roadmaps listing page client component — refactored to use shared components.
 * Shows database-driven technical learning paths with stages/topics.
 *
 * @module RoadmapsClient
 */

'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import SafeImg from '@/app/_components/ui/SafeImg';
import { driveImageUrl } from '@/app/_lib/utils';
import PageHero from '../_components/ui/PageHero';
import PageShell from '../_components/ui/PageShell';
import CTASection from '../_components/ui/CTASection';
import FilterPanel from '../_components/ui/FilterPanel';
import FeaturedSpotlight from '../_components/ui/FeaturedSpotlight';
import { fadeUp, staggerContainer, cardHover, buttonTap, viewportConfig } from '../_components/motion/motion';
import { getColorClasses } from '../_lib/category-colors';
import dynamic from 'next/dynamic';
const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), {
  ssr: false,
});
import { cn } from '../_lib/utils';

// ── Category color palettes for dynamic category display ──────────────────
const CATEGORY_COLOR_MAP = {
  'Competitive Programming': { icon: '🏆', color: 'violet' },
  'Data Structures': { icon: '🌲', color: 'indigo' },
  Algorithms: { icon: '⚙️', color: 'blue' },
  Mathematics: { icon: '∑', color: 'amber' },
  'Web Development': { icon: '🌐', color: 'sky' },
  'Machine Learning': { icon: '🤖', color: 'rose' },
  'System Design': { icon: '🏗️', color: 'teal' },
  'Programming Languages': { icon: '💻', color: 'emerald' },
  'Problem Solving': { icon: '🧠', color: 'rose' },
};

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'popular', label: 'Most Views' },
  { key: 'title', label: 'Title A–Z' },
];

/**
 * Normalize a roadmap from DB to UI shape.
 */
function normalizeRoadmap(r) {
  let textPreview = '';
  if (r.description) {
    textPreview = r.description.substring(0, 160);
  }

  return {
    id: r.id,
    slug: r.slug,
    title: r.title || 'Untitled',
    category: r.category || 'General',
    difficulty: r.difficulty || 'beginner',
    level: r.difficulty
      ? r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1)
      : 'Beginner',
    description: r.description || '',
    duration: r.estimated_duration || '',
    thumbnail: r.thumbnail || null,
    views: r.views ?? 0,
    created_at: r.created_at,
    is_featured: r.is_featured ?? false,
    textPreview,
  };
}

/**
 * Derive unique categories from roadmaps with counts.
 */
function computeCategories(roadmaps) {
  const counts = {};
  roadmaps.forEach((r) => {
    const cat = r.category || 'General';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get color config for a category.
 */
function getCategoryColorConfig(category) {
  if (!category) return { icon: '📚', color: 'gray' };
  const config = CATEGORY_COLOR_MAP[category];
  if (config) return config;

  const colors = ['emerald', 'violet', 'indigo', 'sky', 'amber', 'rose'];
  const icons = ['💡', '🚀', '🎯', '✨', '🔥', '⚡'];

  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  return {
    icon: icons[hash % icons.length],
    color: colors[hash % colors.length],
  };
}

/**
 * Difficulty badge component.
 */
function DifficultyBadge({ difficulty, level }) {
  const diffKey = (difficulty || '').toLowerCase();

  const config = {
    beginner: {
      label: 'Beginner',
      bg: 'bg-emerald-500/10 border-emerald-400/35',
      text: 'text-emerald-200',
      dot: 'bg-emerald-300',
    },
    intermediate: {
      label: 'Intermediate',
      bg: 'bg-amber-500/10 border-amber-400/35',
      text: 'text-amber-100',
      dot: 'bg-amber-300',
    },
    advanced: {
      label: 'Advanced',
      bg: 'bg-rose-500/10 border-rose-400/35',
      text: 'text-rose-100',
      dot: 'bg-rose-300',
    },
  };
  const c = config[diffKey] || {
    label: level,
    bg: 'bg-cyan-500/10 border-cyan-400/35',
    text: 'text-cyan-200',
    dot: 'bg-cyan-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] uppercase',
        c.bg,
        c.text
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />
      {c.label || level}
    </span>
  );
}

/**
 * Single roadmap card showing thumbnail, title, meta, description.
 */
function RoadmapCard({ roadmap }) {
  const categoryConfig = getCategoryColorConfig(roadmap.category);
  const colorKey = categoryConfig.color;
  const colorClasses = getColorClasses(colorKey);

  return (
    <Link
      href={`/roadmaps/${roadmap.slug}`}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/12',
        'bg-linear-to-br from-slate-900/70 to-black/80 shadow-md',
        'transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-lg'
      )}
    >
      <div className={cn('h-1 w-full bg-linear-to-r', colorClasses.accent)} />

      <div className="relative aspect-video overflow-hidden bg-black/20">
        {roadmap.thumbnail ? (
          <SafeImg
            src={driveImageUrl(roadmap.thumbnail)}
            alt={roadmap.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            fallback="/placeholder-roadmap.svg"
          />
        ) : (
          <div
            className={cn(
              'flex h-full items-center justify-center bg-linear-to-br text-5xl',
              colorClasses.accent
            )}
          >
            {categoryConfig.icon}
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
        {roadmap.is_featured && (
          <div className="absolute top-3 left-3 rounded-full border border-amber-300/40 bg-amber-200/12 px-2 py-0.5 text-[9px] font-bold text-amber-100 backdrop-blur">
            Featured
          </div>
        )}
        <div className="absolute right-3 bottom-3">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border bg-black/40 px-2 py-0.5 text-[9px] font-semibold backdrop-blur-sm',
              colorClasses.pill
            )}
          >
            {categoryConfig.icon}
          </span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="line-clamp-2 text-base font-bold text-white">
          {roadmap.title}
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <DifficultyBadge
            difficulty={roadmap.difficulty}
            level={roadmap.level}
          />
          {roadmap.duration && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100">
              {roadmap.duration}
            </span>
          )}
        </div>

        {roadmap.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-300/88">
            {roadmap.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-white/8 pt-2.5 text-xs">
          <div className="flex items-center gap-2">
            {roadmap.views > 0 && (
              <span className="text-slate-400">{roadmap.views}x</span>
            )}
          </div>
          <span className="text-slate-400">→</span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Roadmaps listing page component — 100% database-driven.
 */
export default function RoadmapsClient({
  roadmaps: propRoadmaps = [],
  settings = {},
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [category, setCategory] = useState(null);



  const roadmaps = useMemo(
    () => propRoadmaps.map(normalizeRoadmap),
    [propRoadmaps]
  );
  const featuredRoadmaps = useMemo(
    () => roadmaps.filter((r) => r.is_featured),
    [roadmaps]
  );
  const categories = useMemo(() => computeCategories(roadmaps), [roadmaps]);
  const featuredCount = useMemo(
    () => roadmaps.filter((r) => r.is_featured).length,
    [roadmaps]
  );
  const beginnerCount = useMemo(
    () =>
      roadmaps.filter((r) =>
        (r.difficulty || '').toLowerCase().includes('beginner')
      ).length,
    [roadmaps]
  );

  const difficultyTabs = useMemo(() => {
    const levels = new Set();
    roadmaps.forEach((r) => {
      const diff = (r.difficulty || 'beginner').toLowerCase();
      levels.add(diff);
    });

    const order = { beginner: 1, intermediate: 2, advanced: 3 };
    const tabs = [{ id: 'all', label: 'All Paths' }];

    const sortedLevels = Array.from(levels).sort((a, b) => {
      const oA = order[a] || 99;
      const oB = order[b] || 99;
      if (oA !== oB) return oA - oB;
      return a.localeCompare(b);
    });

    sortedLevels.forEach((level) => {
      let label = level.charAt(0).toUpperCase() + level.slice(1);
      if (level === 'beginner') label = 'Beginner Friendly';
      tabs.push({ id: level, label });
    });

    return tabs;
  }, [roadmaps]);

  const hasFilters = search || category || activeFilter !== 'all';

  // Build filter categories for FilterPanel
  const filterCategories = useMemo(
    () =>
      categories.map(({ category: cat, count }) => {
        const config = getCategoryColorConfig(cat);
        return { key: cat, label: cat, icon: config.icon, color: config.color, count };
      }),
    [categories]
  );

  // Filter & sort roadmaps
  const filtered = useMemo(() => {
    return roadmaps
      .filter((r) => {
        if (activeFilter !== 'all') {
          const rDiff = (r.difficulty || 'beginner').toLowerCase();
          if (rDiff !== activeFilter) return false;
        }
        if (category && r.category !== category) return false;
        if (search) {
          const q = search.toLowerCase();
          const titleMatch = r.title.toLowerCase().includes(q);
          const descMatch = r.description.toLowerCase().includes(q);
          const categoryMatch = r.category.toLowerCase().includes(q);
          if (!titleMatch && !descMatch && !categoryMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest')
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        if (sortBy === 'oldest')
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        if (sortBy === 'popular') return (b.views ?? 0) - (a.views ?? 0);
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [roadmaps, activeFilter, search, category, sortBy]);

  const handleCategory = (c) => {
    setCategory(category === c ? null : c);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const resetFilters = () => {
    setSearch('');
    setCategory(null);
    setActiveFilter('all');
    setSortBy('newest');
  };

  // Difficulty tabs extra row for FilterPanel
  const difficultyTabsRow = (
    <div className="flex flex-wrap gap-1.5">
      {difficultyTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveFilter(tab.id)}
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium transition-all',
            activeFilter === tab.id
              ? 'bg-linear-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-sm'
              : 'border border-white/20 bg-white/6 text-slate-300 hover:bg-white/10'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <PageShell>
      <PageHero
        badge={settings?.roadmaps_page_badge || 'Roadmap Library'}
        badgeIcon="🗺️"
        title={settings?.roadmaps_page_title || 'Structured Skill Roadmaps'}
        description={
          settings?.roadmaps_page_description ||
          'Follow clear, stage-by-stage learning paths curated to help you build practical skills with confidence.'
        }
        subtitle={settings?.roadmaps_page_subtitle || ''}
        stats={[
          { value: String(roadmaps.length), label: 'Roadmaps' },
          { value: String(categories.length), label: 'Domains' },
          { value: String(featuredCount), label: 'Featured' },
          { value: String(beginnerCount), label: 'Beginner Friendly' },
        ]}
      />

      {/* Featured spotlight */}
      {featuredRoadmaps.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FeaturedSpotlight
            items={featuredRoadmaps}
            getImage={(r) => r.thumbnail}
            getTitle={(r) => r.title}
            getDescription={(r) =>
              r.description ||
              'Explore this roadmap to build strong fundamentals and move through a clear progression path.'
            }
            getHref={(r) => `/roadmaps/${r.slug}`}
            ctaLabel="Explore Roadmap"
            sectionTitle="Featured Roadmaps"
            renderBadges={(r) => (
              <DifficultyBadge difficulty={r.difficulty} level={r.level} />
            )}
            renderMeta={(r) => (
              <>
                {r.category && (
                  <span className="flex items-center gap-1.5">
                    <span>{getCategoryColorConfig(r.category).icon}</span>
                    {r.category}
                  </span>
                )}
                {r.duration && (
                  <span className="flex items-center gap-1.5">
                    <span>⏱</span>
                    {r.duration}
                  </span>
                )}
              </>
            )}
          />
        </section>
      )}

      {/* Technical Roadmaps Section */}
      <section className="relative px-4 py-8 sm:px-6 md:py-10 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Filter Panel */}
          <FilterPanel
            search={search}
            onSearchChange={handleSearch}
            searchPlaceholder="Search…"
            sortBy={sortBy}
            onSortChange={(e) => setSortBy(e.target.value)}
            sortOptions={SORT_OPTIONS}
            categories={filterCategories}
            activeCategory={category}
            onCategoryChange={handleCategory}
            getCategoryClasses={(cat, isActive) => {
              const cls = getColorClasses(cat.color);
              return isActive ? cls.active : cls.pill + ' hover:opacity-80';
            }}
            hasFilters={!!hasFilters}
            onReset={resetFilters}
            extraRow={difficultyTabsRow}
          />

          {/* Roadmap Grid */}
          {filtered.length > 0 ? (
            <motion.div
              variants={staggerContainer(0.08)}
              initial="hidden"
              whileInView="visible"
              viewport={viewportConfig}
              className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3"
            >
              {filtered.map((roadmap) => (
                <motion.div
                  key={roadmap.id}
                  variants={fadeUp}
                  whileHover={cardHover}
                  whileTap={buttonTap}
                >
                  <RoadmapCard roadmap={roadmap} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-white/12 bg-black/20 px-8 py-12 text-center">
              <p className="text-sm text-slate-400">
                {hasFilters
                  ? 'No roadmaps found'
                  : 'Check back soon for new paths'}
              </p>
            </div>
          )}
        </div>
      </section>

      <CTASection
        icon="🚀"
        title={settings?.roadmaps_page_cta_title || 'Ready to Start Learning?'}
        description={
          settings?.roadmaps_page_cta_description ||
          'Join NEUPC and get guidance from experienced mentors on your chosen roadmap.'
        }
        primaryAction={{ label: 'Join NEUPC', href: '/join' }}
      />

      <ScrollToTop />
    </PageShell>
  );
}
