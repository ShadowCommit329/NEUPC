/**
 * @file Events listing client component — refactored to use shared components.
 * Searchable, filterable, paginated event cards with featured spotlight,
 * grid/list view toggle, animated transitions, and polished filter UX.
 *
 * @module EventsClient
 */

'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import EventCard from '../_components/ui/EventCard';
import PageHero from '../_components/ui/PageHero';
import PageShell from '../_components/ui/PageShell';
import CTASection from '../_components/ui/CTASection';
import FilterPanel from '../_components/ui/FilterPanel';
import FeaturedSpotlight from '../_components/ui/FeaturedSpotlight';
import InlinePagination from '../_components/ui/InlinePagination';
import SafeImg from '../_components/ui/SafeImg';
import { fadeUp, staggerContainer, cardHover, buttonTap, viewportConfig } from '../_components/motion/motion';
import { cn, driveImageUrl } from '../_lib/utils';
import { getColorClasses } from '../_lib/category-colors';
import dynamic from 'next/dynamic';

const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), {
  ssr: false,
});

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'Workshop', icon: '🔧', color: 'blue' },
  { key: 'Contest', icon: '🏆', color: 'amber' },
  { key: 'Seminar', icon: '🎤', color: 'purple' },
  { key: 'Bootcamp', icon: '⚡', color: 'emerald' },
  { key: 'Hackathon', icon: '💻', color: 'rose' },
  { key: 'Meetup', icon: '🤝', color: 'sky' },
  { key: 'Other', icon: '📌', color: 'gray' },
];

const STATUS_CONFIG = {
  all: { label: 'All Events', dot: '', tab: 'bg-white/10 text-white' },
  upcoming: {
    label: 'Upcoming',
    dot: 'bg-blue-400',
    tab: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  },
  ongoing: {
    label: 'Live Now',
    dot: 'bg-emerald-400 animate-pulse',
    tab: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-purple-400',
    tab: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
  },
};

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'title', label: 'Title A–Z' },
];

const LIST_PER_PAGE = 5;
const GRID_PER_PAGE = 9;

// ─── Grid Card ────────────────────────────────────────────────────────────────

function GridCard({ event }) {
  const sc = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.upcoming;
  const image = event.cover_image || event.image;

  return (
    <motion.div variants={fadeUp} whileHover={cardHover} whileTap={buttonTap}>
    <Link
      href={`/events/${event.slug || event.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/3 transition-colors duration-300 hover:border-white/15 hover:shadow-xl hover:shadow-black/30"
    >
      {/* Cover image */}
      <div className="relative h-44 overflow-hidden bg-white/5">
        {image ? (
          <SafeImg
            src={driveImageUrl(image)}
            alt={event.title || ''}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl opacity-20">
            📅
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
        <span
          className={cn(
            'absolute top-3 left-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm',
            sc.tab
          )}
        >
          {sc.dot && (
            <span className={cn('h-1.5 w-1.5 rounded-full', sc.dot)} />
          )}
          {sc.label}
        </span>
        {event.is_featured && (
          <span className="absolute top-3 right-3 rounded-full bg-amber-500/80 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            ✨ Featured
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        {event.category && (
          <span className="w-fit rounded-lg border border-white/8 bg-white/5 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
            {event.category}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm leading-snug font-bold text-white transition-colors group-hover:text-primary-300">
          {event.title}
        </h3>
        {event.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
            {event.description}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-white/6 pt-3 text-[11px] text-gray-600">
          {event.start_date && (
            <span className="flex items-center gap-1">
              📅{' '}
              {new Date(event.start_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1 truncate">
              📍 {event.location}
            </span>
          )}
        </div>
      </div>
    </Link>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/** @param {{ events?: Object[], settings?: Object }} props */
export default function EventsClient({ events = [], settings = {} }) {
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState('list');
  const [currentPage, setCurrentPage] = useState(1);

  const listAnchor = useRef(null);

  // ── derived counts ────────────────────────────────────────────────────────
  const counts = useMemo(
    () => ({
      all: events.length,
      upcoming: events.filter((e) => e.status === 'upcoming').length,
      ongoing: events.filter((e) => e.status === 'ongoing').length,
      completed: events.filter((e) => e.status === 'completed').length,
    }),
    [events]
  );

  // ── featured events ─────────────────────────────────────────────────────
  const featuredEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          e.is_featured &&
          ['upcoming', 'ongoing', 'completed'].includes(e.status)
      ),
    [events]
  );

  // Build filter categories for FilterPanel
  const filterCategories = useMemo(
    () => CATEGORIES.map(({ key, icon, color }) => ({ key, label: key, icon, color })),
    []
  );

  // ── filtering + sorting ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = events;
    if (statusTab !== 'all') list = list.filter((e) => e.status === statusTab);
    if (category) list = list.filter((e) => e.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'oldest')
        return new Date(a.start_date) - new Date(b.start_date);
      if (sortBy === 'title')
        return (a.title ?? '').localeCompare(b.title ?? '');
      return new Date(b.start_date) - new Date(a.start_date);
    });
  }, [events, statusTab, category, search, sortBy]);

  const perPage = view === 'grid' ? GRID_PER_PAGE : LIST_PER_PAGE;
  const totalPages = Math.ceil(filtered.length / perPage);
  const pageEvents = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const hasFilters = !!(search || category || statusTab !== 'all');
  const activeFilterCount = [search, category, statusTab !== 'all'].filter(
    Boolean
  ).length;

  // ── handlers ──────────────────────────────────────────────────────────────
  function goToPage(p) {
    setCurrentPage(p);
    listAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function setViewMode(v) {
    setView(v);
    setCurrentPage(1);
  }
  function resetFilters() {
    setSearch('');
    setCategory('');
    setStatusTab('all');
    setSortBy('newest');
    setCurrentPage(1);
  }
  function handleTabChange(key) {
    setStatusTab(key);
    setCurrentPage(1);
  }
  function handleCategory(cat) {
    setCategory((p) => (p === cat ? '' : cat));
    setCurrentPage(1);
  }
  function handleSearch(e) {
    setSearch(e.target.value);
    setCurrentPage(1);
  }

  // ── Status tabs extra row for FilterPanel ──────────────────────────────
  const statusTabs = (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
        const active = statusTab === key;
        return (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all',
              active
                ? cfg.tab
                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            )}
          >
            {cfg.dot && (
              <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
            )}
            {cfg.label}
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 text-[10px] tabular-nums',
                active ? 'bg-white/15' : 'text-gray-600'
              )}
            >
              {counts[key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <PageShell>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <PageHero
        badgeIcon="📅"
        badge={settings?.events_page_badge || 'Events & Activities'}
        title={settings?.events_page_title || 'Explore Our Events'}
        description={
          settings?.events_page_description ||
          'Workshops, programming contests, hackathons, and more — crafted to help you grow as a developer and connect with the community.'
        }
        subtitle={
          settings?.events_page_subtitle ||
          'From ICPC prep to beginner-friendly workshops, every event is designed to level up your skills.'
        }
        stats={[
          { value: String(counts.all), label: 'Total Events' },
          { value: String(counts.upcoming), label: 'Upcoming' },
          { value: String(counts.ongoing), label: 'Live Now' },
          { value: String(counts.completed), label: 'Completed' },
        ]}
      />

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        {/* Featured spotlight */}
        {featuredEvents.length > 0 && (
          <FeaturedSpotlight
            items={featuredEvents}
            getImage={(e) => e.cover_image || e.banner_image || e.image}
            getTitle={(e) => e.title}
            getDescription={(e) => e.description}
            getHref={(e) => `/events/${e.slug || e.id}`}
            ctaLabel="View Details"
            sectionTitle="Featured Events"
            renderBadges={(e) => {
              const sc = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.upcoming;
              return (
                <>
                  <span
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                      sc.tab
                    )}
                  >
                    {sc.dot && (
                      <span
                        className={cn('h-1.5 w-1.5 rounded-full', sc.dot)}
                      />
                    )}
                    {sc.label}
                  </span>
                  {e.category && (
                    <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-medium text-gray-400">
                      {e.category}
                    </span>
                  )}
                </>
              );
            }}
            renderMeta={(e) => (
              <>
                {e.start_date && (
                  <span className="flex items-center gap-1.5">
                    <span>📅</span>
                    {new Date(e.start_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {e.location && (
                  <span className="flex items-center gap-1.5">
                    <span>📍</span>
                    {e.location}
                  </span>
                )}
              </>
            )}
          />
        )}

        {/* ── Filter panel ── */}
        <FilterPanel
          search={search}
          onSearchChange={handleSearch}
          searchPlaceholder="Search by title, location, category…"
          sortBy={sortBy}
          onSortChange={(e) => {
            setSortBy(e.target.value);
            setCurrentPage(1);
          }}
          sortOptions={SORT_OPTIONS}
          categories={filterCategories}
          activeCategory={category}
          onCategoryChange={handleCategory}
          getCategoryClasses={(cat, isActive) => {
            const cls = getColorClasses(cat.color);
            return isActive ? cls.active : cls.pill + ' hover:opacity-80';
          }}
          showViewToggle
          view={view}
          onViewChange={setViewMode}
          hasFilters={hasFilters}
          activeFilterCount={activeFilterCount}
          onReset={resetFilters}
          extraRow={statusTabs}
        />

        {/* Results header */}
        <div ref={listAnchor} className="mb-6">
          <p className="text-sm text-gray-500">
            {hasFilters ? (
              <>
                <span className="font-semibold text-gray-300">
                  {filtered.length}
                </span>{' '}
                result{filtered.length !== 1 ? 's' : ''} found
              </>
            ) : (
              <>
                <span className="font-semibold text-gray-300">
                  {events.length}
                </span>{' '}
                event{events.length !== 1 ? 's' : ''} total
              </>
            )}
          </p>
        </div>

        {pageEvents.length > 0 ? (
          <>
            {view === 'list' ? (
              /* ── List view ── */
              <motion.div
                variants={staggerContainer(0.1)}
                initial="hidden"
                whileInView="visible"
                viewport={viewportConfig}
                className="space-y-8 lg:space-y-12"
              >
                {pageEvents.map((event, index) => (
                  <motion.div key={event.id} variants={fadeUp}>
                    <EventCard event={event} index={index} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              /* ── Grid view ── */
              <motion.div
                variants={staggerContainer(0.07)}
                initial="hidden"
                whileInView="visible"
                viewport={viewportConfig}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
              {pageEvents.map((event) => (
                <GridCard
                  key={event.id}
                  event={event}
                />
              ))}
              </motion.div>
            )}

            <InlinePagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              perPage={perPage}
              onPageChange={goToPage}
              itemLabel="event"
            />
          </>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/8 bg-white/2 py-24 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 text-4xl">
              {hasFilters ? '🔍' : '📭'}
            </div>
            <h3 className="text-lg font-bold text-gray-200">
              {hasFilters ? 'No matching events' : 'No events yet'}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              {hasFilters
                ? 'Try adjusting your search, status filter, or category.'
                : 'Events will appear here once published. Check back soon!'}
            </p>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="mt-7 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-gray-300 transition-all hover:bg-white/10 hover:text-white"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </section>

      <CTASection
        icon="🎯"
        title={settings?.events_page_cta_title || "Don't Miss Out!"}
        description={
          settings?.events_page_cta_description ||
          'Stay updated with our latest events and activities. Join our community to receive notifications.'
        }
      />

      <ScrollToTop />
    </PageShell>
  );
}
