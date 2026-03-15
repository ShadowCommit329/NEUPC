/**
 * @file Achievement management client — admin interface for listing,
 *   creating, editing, and awarding achievements and badges to members.
 * @module AdminAchievementManagementClient
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import AchievementCard from './AchievementCard';
import AchievementFormModal from './AchievementFormModal';
import MembersModal from './MembersModal';
import GalleryModal from './GalleryModal';
import ParticipationHistoryModal from './ParticipationHistoryModal';
import JourneyModal from './JourneyModal';
import { Trophy, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import {
  getStatCards,
  ACHIEVEMENT_CATEGORIES,
  getCategoryConfig,
} from './achievementConfig';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'featured', label: '⭐ Featured' },
  { id: 'team', label: '👥 Team' },
  { id: 'individual', label: '👤 Individual' },
  { id: 'thisYear', label: '📅 This Year' },
];

const PAGE_SIZE = 12;

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '…', total];
  if (current >= total - 2)
    return [1, '…', total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

// ── Category-wise grouped view ─────────────────────────────────────────────────
function CategoryView({ items, onEdit, onManageMembers, onManageGallery }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const a of items) {
      const key = a.category?.split(',')[0]?.trim() ?? 'Uncategorised';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    // Sort groups: categorised first (sorted by name), uncategorised last
    const sorted = [...map.entries()].sort(([a], [b]) => {
      if (a === 'Uncategorised') return 1;
      if (b === 'Uncategorised') return -1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [items]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-5xl">🏆</div>
        <p className="font-medium text-slate-400">No achievements found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map(([category, groupItems]) => {
        const catConf = getCategoryConfig(
          category === 'Uncategorised' ? null : category
        );
        return (
          <section key={category}>
            {/* Category header */}
            <div className="mb-3 flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${catConf.color}`}
              >
                {catConf.emoji} {category}
              </span>
              <span className="text-xs text-slate-500">
                {groupItems.length} achievement
                {groupItems.length !== 1 ? 's' : ''}
              </span>
              <div className="h-px flex-1 bg-slate-700/40" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groupItems.map((a) => (
                <AchievementCard
                  key={a.id}
                  achievement={a}
                  onEdit={onEdit}
                  onManageMembers={onManageMembers}
                  onManageGallery={onManageGallery}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function AchievementManagementClient({
  initialAchievements = [],
  stats,
  users = [],
  initialParticipations = [],
  initialJourney = [],
}) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [membersItem, setMembersItem] = useState(null);
  const [galleryItem, setGalleryItem] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'category'
  const [page, setPage] = useState(1);

  const currentYear = new Date().getFullYear();

  // ── Derived filter options ─────────────────────────────────────────────────
  const allCategories = useMemo(
    () =>
      [
        ...new Set(
          initialAchievements.flatMap((a) =>
            a.category
              ? a.category
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : []
          )
        ),
      ].sort(),
    [initialAchievements]
  );

  const allYears = useMemo(
    () =>
      [...new Set(initialAchievements.map((a) => a.year).filter(Boolean))].sort(
        (a, b) => b - a
      ),
    [initialAchievements]
  );

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const counts = useMemo(
    () => ({
      all: initialAchievements.length,
      featured: initialAchievements.filter((a) => a.is_featured).length,
      team: initialAchievements.filter((a) => a.is_team).length,
      individual: initialAchievements.filter((a) => !a.is_team).length,
      thisYear: initialAchievements.filter((a) => a.year === currentYear)
        .length,
    }),
    [initialAchievements, currentYear]
  );

  // ── Filtered achievements ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let items = [...initialAchievements];

    if (tab === 'featured') items = items.filter((a) => a.is_featured);
    else if (tab === 'team') items = items.filter((a) => a.is_team);
    else if (tab === 'individual') items = items.filter((a) => !a.is_team);
    else if (tab === 'thisYear')
      items = items.filter((a) => a.year === currentYear);

    if (categoryFilter)
      items = items.filter((a) =>
        a.category
          ?.split(',')
          .map((s) => s.trim())
          .includes(categoryFilter)
      );
    if (yearFilter) items = items.filter((a) => String(a.year) === yearFilter);

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.contest_name?.toLowerCase().includes(q) ||
          a.result?.toLowerCase().includes(q) ||
          a.team_name?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.participants?.some((p) => p.toLowerCase().includes(q))
      );
    }

    return items;
  }, [
    initialAchievements,
    tab,
    search,
    categoryFilter,
    yearFilter,
    currentYear,
  ]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [tab, search, categoryFilter, yearFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const statCards = getStatCards(stats);

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-yellow-500/8 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <nav className="mb-3 flex items-center gap-1.5 text-[11px] text-gray-500">
              <Link
                href="/account/admin"
                className="transition-colors hover:text-gray-300"
              >
                Dashboard
              </Link>
              <ChevronRight className="h-3 w-3 text-gray-700" />
              <span className="font-medium text-gray-400">Achievements</span>
            </nav>
            <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/25">
                <Trophy className="h-5 w-5 text-amber-400" />
              </div>
              Achievement Management
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Track contest wins, hackathons, placements, and club milestones.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Link
              href="/account/admin"
              className="rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              ← Dashboard
            </Link>
            <button
              onClick={() => setJourneyOpen(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              <span className="text-sm">🗺️</span>
              Journey
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              History
            </button>
            <div className="flex rounded-xl border border-white/8 bg-white/5 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid view"
                className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${viewMode === 'grid' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm6.5-9A2.25 2.25 0 008.5 4.25v2.5A2.25 2.25 0 0010.75 9h2.5A2.25 2.25 0 0015.5 6.75v-2.5A2.25 2.25 0 0013.25 2h-2.5zm0 9A2.25 2.25 0 008.5 13.25v2.5A2.25 2.25 0 0010.75 18h2.5A2.25 2.25 0 0015.5 15.75v-2.5A2.25 2.25 0 0013.25 11h-2.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('category')}
                title="Category view"
                className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${viewMode === 'category' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.5 3A1.5 1.5 0 006 4.5v.75a.75.75 0 001.5 0V4.5A1.5 1.5 0 009 3h2a1.5 1.5 0 011.5 1.5v.75a.75.75 0 001.5 0V4.5A1.5 1.5 0 0012.5 3h-5zm-3 4.5a1.5 1.5 0 00-1.5 1.5v7a1.5 1.5 0 001.5 1.5h11a1.5 1.5 0 001.5-1.5V9a1.5 1.5 0 00-1.5-1.5h-11z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="group flex shrink-0 items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-amber-900/30 transition-all hover:-translate-y-0.5 hover:bg-amber-500 hover:shadow-xl hover:shadow-amber-900/40"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Add Achievement
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`bg-linear-to-br ${s.color} flex flex-col gap-1 rounded-xl border p-3.5`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">{s.icon}</span>
              <span className={`text-xl font-bold ${s.text}`}>{s.value}</span>
            </div>
            <p className="truncate text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Year Timeline strip ───────────────────────────────────────────── */}
      {allYears.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-xs text-slate-500">Jump to year:</span>
          {allYears.map((y) => (
            <button
              key={y}
              onClick={() =>
                setYearFilter(yearFilter === String(y) ? '' : String(y))
              }
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                yearFilter === String(y)
                  ? 'border-amber-500 bg-amber-600 text-white'
                  : 'border-slate-700/40 bg-slate-800/60 text-slate-400 hover:border-amber-500/40 hover:text-amber-400'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, contest, result, team, participants…"
            className="w-full rounded-xl border border-slate-700/50 bg-slate-800/60 py-2 pr-4 pl-9 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm text-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {allCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Year filter */}
        {allYears.length > 0 && (
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm text-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="">All years</option>
            {allYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}

        {/* Clear filters */}
        {(categoryFilter || yearFilter || search) && (
          <button
            onClick={() => {
              setCategoryFilter('');
              setYearFilter('');
              setSearch('');
            }}
            className="rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex w-fit gap-1 overflow-x-auto rounded-xl border border-slate-700/40 bg-slate-800/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}{' '}
            <span
              className={`ml-1 text-xs ${tab === t.id ? 'text-amber-200' : 'text-slate-600'}`}
            >
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-3 text-5xl">🏆</div>
          <p className="font-medium text-slate-400">No achievements found</p>
          <p className="mt-1 text-sm text-slate-500">
            {search || categoryFilter || yearFilter
              ? 'Try adjusting your filters.'
              : 'Add your first achievement to get started.'}
          </p>
          {!search && !categoryFilter && !yearFilter && (
            <button
              onClick={() => setAddOpen(true)}
              className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
            >
              Add Achievement
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            Showing{' '}
            {filtered.length === 0
              ? '0'
              : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)}`}{' '}
            of {filtered.length} achievements
          </p>
          {viewMode === 'category' ? (
            <CategoryView
              items={filtered}
              onEdit={(item) => setEditItem(item)}
              onManageMembers={(item) => setMembersItem(item)}
              onManageGallery={(item) => setGalleryItem(item)}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedItems.map((a) => (
                  <AchievementCard
                    key={a.id}
                    achievement={a}
                    onEdit={(item) => setEditItem(item)}
                    onManageMembers={(item) => setMembersItem(item)}
                    onManageGallery={(item) => setGalleryItem(item)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(1)}
                      disabled={currentPage <= 1}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-2 py-1.5 text-xs text-slate-400 transition-colors hover:text-white disabled:opacity-30"
                      title="First page"
                    >
                      ««
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-white disabled:opacity-30"
                    >
                      ‹ Prev
                    </button>
                    {getPageNumbers(currentPage, totalPages).map((p, i) =>
                      p === '…' ? (
                        <span
                          key={`e${i}`}
                          className="px-1.5 text-xs text-slate-600"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`min-w-8 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                            p === currentPage
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'border border-slate-700/50 bg-slate-800/60 text-slate-400 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage >= totalPages}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-white disabled:opacity-30"
                    >
                      Next ›
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={currentPage >= totalPages}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-2 py-1.5 text-xs text-slate-400 transition-colors hover:text-white disabled:opacity-30"
                      title="Last page"
                    >
                      »»
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {addOpen && <AchievementFormModal onClose={() => setAddOpen(false)} />}
      {editItem && (
        <AchievementFormModal
          achievement={editItem}
          onClose={() => setEditItem(null)}
        />
      )}
      {membersItem && (
        <MembersModal
          achievement={membersItem}
          users={users}
          onClose={() => setMembersItem(null)}
        />
      )}
      {galleryItem && (
        <GalleryModal
          achievement={galleryItem}
          onClose={() => setGalleryItem(null)}
        />
      )}
      {historyOpen && (
        <ParticipationHistoryModal
          initialParticipations={initialParticipations}
          users={users}
          achievements={initialAchievements}
          onClose={() => setHistoryOpen(false)}
        />
      )}
      {journeyOpen && (
        <JourneyModal
          initialItems={initialJourney}
          onClose={() => setJourneyOpen(false)}
        />
      )}
    </div>
  );
}
