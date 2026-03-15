/**
 * @file Roadmap management client — full-featured admin interface for listing,
 *   filtering, creating, editing, and managing club roadmaps with stats and
 *   grid / table views.
 * @module AdminRoadmapManagementClient
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Map,
  Star,
  Search,
  PlusCircle,
  Eye,
  FileEdit,
  CheckCircle2,
  Archive,
  Layers,
  LayoutGrid,
  LayoutList,
  ArrowUpDown,
  Edit3,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import RoadmapCard from './RoadmapCard';
import RoadmapFormPanel from './RoadmapFormPanel';
import {
  getStatusConfig,
  getCategoryConfig,
  getDifficultyConfig,
  formatRoadmapDate,
  sortRoadmaps,
  CATEGORIES,
  DIFFICULTIES,
  SORT_OPTIONS,
} from './roadmapConfig';

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  colorClass,
  sub,
  accentGradient,
}) {
  return (
    <div className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/6 bg-[#161b22] px-4 py-3.5 transition-all hover:border-white/10 hover:bg-[#1c2128]">
      {accentGradient && (
        <div
          className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 ${accentGradient}`}
        />
      )}
      <div
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="relative min-w-0">
        <p className="font-mono text-lg leading-none font-bold text-white tabular-nums">
          {value}
        </p>
        <p className="mt-1 truncate font-mono text-[10px] text-gray-600">
          {label}
        </p>
        {sub && (
          <p className="mt-0.5 truncate font-mono text-[9px] text-amber-500/70">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ tab, onCreateClick }) {
  const msgs = {
    all: {
      icon: Map,
      title: 'No roadmaps yet',
      sub: 'Create your first roadmap to guide members on their learning journeys.',
    },
    draft: {
      icon: FileEdit,
      title: 'No draft roadmaps',
      sub: 'Drafts appear here when saved unpublished.',
    },
    published: { icon: CheckCircle2, title: 'No published roadmaps', sub: '' },
    archived: { icon: Archive, title: 'No archived roadmaps', sub: '' },
  };
  const { icon: Icon, title, sub } = msgs[tab] ?? msgs.all;
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-20 text-center">
      <Icon className="mb-4 h-12 w-12 text-gray-700" />
      <p className="text-sm font-semibold text-gray-400">{title}</p>
      {sub && <p className="mt-1 text-xs text-gray-600">{sub}</p>}
      {tab === 'all' && (
        <button
          onClick={onCreateClick}
          className="mt-5 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-500"
        >
          <PlusCircle className="h-3.5 w-3.5" /> New Roadmap
        </button>
      )}
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-all ${
        active
          ? 'bg-white/12 text-white shadow-sm'
          : 'text-gray-500 hover:bg-white/6 hover:text-gray-300'
      }`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${active ? 'bg-white/15 text-white' : 'bg-white/6 text-gray-600'}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export default function RoadmapManagementClient({ initialRoadmaps, stats }) {
  const router = useRouter();
  const [roadmaps, setRoadmaps] = useState(initialRoadmaps ?? []);

  // Sync local state when server re-renders with fresh data (after router.refresh())
  useEffect(() => {
    setRoadmaps(initialRoadmaps ?? []);
  }, [initialRoadmaps]);

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [formModal, setFormModal] = useState(null); // null | { mode, roadmap? }
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [sortOpen, setSortOpen] = useState(false);

  // ── state sync handlers ───────────────────────────────────────────────
  const handleRoadmapChange = useCallback((roadmapId, changes) => {
    setRoadmaps((prev) =>
      prev.map((r) => (r.id === roadmapId ? { ...r, ...changes } : r))
    );
  }, []);

  const handleRoadmapDelete = useCallback((roadmapId) => {
    setRoadmaps((prev) => prev.filter((r) => r.id !== roadmapId));
  }, []);

  const handleSaved = useCallback(() => {
    // Refresh server data so local state picks up new/edited roadmaps
    router.refresh();
    // Re-fetch fresh roadmaps after a short delay for revalidation to complete
    const timer = setTimeout(() => {
      router.refresh();
    }, 500);
    return () => clearTimeout(timer);
  }, [router]);

  // ── derived stats ─────────────────────────────────────────────────────────
  const live = {
    total: roadmaps.length,
    published: roadmaps.filter((r) => r.status === 'published').length,
    draft: roadmaps.filter((r) => r.status === 'draft').length,
    archived: roadmaps.filter((r) => r.status === 'archived').length,
    featured: roadmaps.filter((r) => r.is_featured).length,
    totalViews: roadmaps.reduce((s, r) => s + (r.views ?? 0), 0),
  };

  // ── filtered + sorted roadmaps ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    const result = roadmaps.filter((r) => {
      const matchesTab = activeTab === 'all' || r.status === activeTab;
      const matchesSearch =
        !search ||
        r.title?.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase()) ||
        r.category?.toLowerCase().includes(search.toLowerCase());
      const matchesCat = !categoryFilter || r.category === categoryFilter;
      const matchesDiff =
        !difficultyFilter || r.difficulty === difficultyFilter;
      return matchesTab && matchesSearch && matchesCat && matchesDiff;
    });
    return sortRoadmaps(result, sortBy);
  }, [roadmaps, activeTab, search, categoryFilter, difficultyFilter, sortBy]);

  return (
    <>
      <div className="space-y-6">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
          {/* decorative orbs */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-500/6 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-violet-500/5 blur-3xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <nav className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
                <Link
                  href="/account/admin"
                  className="transition-colors hover:text-gray-300"
                >
                  Dashboard
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-gray-400">Roadmap Management</span>
              </nav>
              <h1 className="flex items-center gap-3 text-xl font-bold text-white sm:text-2xl">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 ring-1 ring-blue-500/30">
                  <Map className="h-5 w-5 text-blue-400" />
                </div>
                Roadmap Management
              </h1>
              <p className="mt-1.5 text-sm text-gray-500">
                {live.total} roadmap{live.total !== 1 ? 's' : ''} ·{' '}
                {live.published} published · {live.totalViews.toLocaleString()}{' '}
                total views
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Link
                href="/account/admin"
                className="rounded-xl bg-white/6 px-4 py-2.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                ← Dashboard
              </Link>
              <button
                onClick={() => setFormModal({ mode: 'create' })}
                className="group flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-blue-500 active:scale-95"
              >
                <PlusCircle className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
                New Roadmap
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            icon={Layers}
            label="Total Roadmaps"
            value={live.total}
            colorClass="bg-gray-700/50 text-gray-300"
            accentGradient="bg-linear-to-br from-gray-500/5 to-transparent"
          />
          <StatCard
            icon={CheckCircle2}
            label="Published"
            value={live.published}
            colorClass="bg-emerald-500/15 text-emerald-400"
            accentGradient="bg-linear-to-br from-emerald-500/8 to-transparent"
          />
          <StatCard
            icon={FileEdit}
            label="Drafts"
            value={live.draft}
            colorClass="bg-gray-600/20 text-gray-400"
            accentGradient="bg-linear-to-br from-gray-500/6 to-transparent"
          />
          <StatCard
            icon={Star}
            label="Featured"
            value={live.featured}
            colorClass="bg-amber-500/15 text-amber-400"
            accentGradient="bg-linear-to-br from-amber-500/8 to-transparent"
          />
          <StatCard
            icon={Eye}
            label="Total Views"
            value={
              live.totalViews >= 1000
                ? `${(live.totalViews / 1000).toFixed(1)}k`
                : live.totalViews
            }
            colorClass="bg-blue-500/15 text-blue-400"
            accentGradient="bg-linear-to-br from-blue-500/8 to-transparent"
          />
          <StatCard
            icon={TrendingUp}
            label="Trending"
            value={roadmaps.filter((r) => (r.views ?? 0) > 100).length}
            colorClass="bg-violet-500/15 text-violet-400"
            accentGradient="bg-linear-to-br from-violet-500/8 to-transparent"
          />
        </div>

        {/* ── Tabs + filters ────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="scrollbar-hide flex gap-1 overflow-x-auto pb-1">
              <TabButton
                active={activeTab === 'all'}
                onClick={() => setActiveTab('all')}
                count={live.total}
              >
                All
              </TabButton>
              <TabButton
                active={activeTab === 'published'}
                onClick={() => setActiveTab('published')}
                count={live.published}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{' '}
                Published
              </TabButton>
              <TabButton
                active={activeTab === 'draft'}
                onClick={() => setActiveTab('draft')}
                count={live.draft}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Draft
              </TabButton>
              <TabButton
                active={activeTab === 'archived'}
                onClick={() => setActiveTab('archived')}
                count={live.archived}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{' '}
                Archived
              </TabButton>
            </div>

            {/* View mode toggle */}
            <div className="flex shrink-0 items-center gap-1 rounded-xl border border-white/8 bg-white/3 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white/12 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-white/12 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                Table
              </button>
            </div>
          </div>

          {/* Search + Sort + Category + Difficulty */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roadmaps by title, description, category…"
                className="w-full rounded-xl border border-white/8 bg-white/4 py-2 pr-3 pl-8 text-xs text-white placeholder-gray-600 transition-all outline-none focus:border-white/20 focus:bg-white/6"
              />
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs text-gray-300 transition-colors hover:border-white/15 hover:text-white"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-gray-500" />
                {SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? 'Sort'}
                <ChevronDown className="h-3 w-3 text-gray-600" />
              </button>
              {sortOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setSortOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-white/10 bg-gray-900 shadow-2xl">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSortBy(opt.key);
                          setSortOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/6 ${
                          sortBy === opt.key
                            ? 'bg-white/6 text-white'
                            : 'text-gray-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Category filter */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none rounded-xl border border-white/8 bg-white/4 py-2 pr-8 pl-3 text-xs text-gray-300 outline-none focus:border-white/20"
                style={{ colorScheme: 'dark' }}
              >
                <option value="">All categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryConfig(cat).label}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty filter */}
            <div className="relative">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="appearance-none rounded-xl border border-white/8 bg-white/4 py-2 pr-8 pl-3 text-xs text-gray-300 outline-none focus:border-white/20"
                style={{ colorScheme: 'dark' }}
              >
                <option value="">All levels</option>
                {DIFFICULTIES.map((d) => {
                  const cfg = getDifficultyConfig(d);
                  return (
                    <option key={d} value={d}>
                      {cfg.label}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Results count */}
          {(search ||
            categoryFilter ||
            difficultyFilter ||
            activeTab !== 'all') && (
            <p className="text-[11px] text-gray-600">
              Showing {filtered.length} of {roadmaps.length} roadmap
              {roadmaps.length !== 1 ? 's' : ''}
              {search && (
                <span>
                  {' '}
                  matching &quot;
                  <span className="text-gray-400">{search}</span>&quot;
                </span>
              )}
            </p>
          )}
        </div>

        {/* ── Roadmap grid / table ──────────────────────────────────────────– */}
        {filtered.length === 0 ? (
          <EmptyState
            tab={activeTab}
            onCreateClick={() => setFormModal({ mode: 'create' })}
          />
        ) : viewMode === 'table' ? (
          /* ── Table View ────────────────────────────────────────────────── */
          <div className="overflow-x-auto rounded-xl border border-white/8 bg-[#0d1117]">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/6 bg-[#161b22]">
                  <th className="w-8 px-3 py-3 text-center font-medium text-gray-700">
                    #
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-500">
                    roadmap
                  </th>
                  <th className="hidden px-4 py-3 font-medium text-gray-500 md:table-cell">
                    category
                  </th>
                  <th className="hidden px-4 py-3 font-medium text-gray-500 lg:table-cell">
                    difficulty
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-500">
                    status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">
                    views
                  </th>
                  <th className="hidden px-4 py-3 font-medium text-gray-500 lg:table-cell">
                    date
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">
                    actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {filtered.map((roadmap, rowIdx) => {
                  const tsc = getStatusConfig(roadmap.status);
                  const tcc = getCategoryConfig(roadmap.category);
                  const tdc = getDifficultyConfig(roadmap.difficulty);
                  return (
                    <tr
                      key={roadmap.id}
                      className="group transition-colors hover:bg-[#161b22]"
                    >
                      {/* line number */}
                      <td className="px-3 py-3 text-center font-mono text-[10px] text-gray-700 select-none">
                        {String(rowIdx + 1).padStart(2, '0')}
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`hidden h-8 w-12 shrink-0 items-center justify-center rounded-md bg-linear-to-br sm:flex ${tcc.gradient}`}
                          >
                            <span className="text-sm opacity-50">
                              {tcc.emoji}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs font-semibold text-gray-200">
                              {roadmap.title}
                            </p>
                            {roadmap.is_featured && (
                              <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-[9px] text-amber-400">
                                <Star className="h-2.5 w-2.5 fill-current" />{' '}
                                featured
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {roadmap.category ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${tcc.badge}`}
                          >
                            <span>{tcc.icon}</span>
                            {tcc.short}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${tdc.badge}`}
                        >
                          {tdc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${tsc.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${tsc.dot}`}
                          />
                          {tsc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500 tabular-nums">
                        {(roadmap.views ?? 0).toLocaleString()}
                      </td>
                      <td
                        className="hidden px-4 py-3 font-mono text-[11px] text-gray-700 lg:table-cell"
                        title={formatRoadmapDate(roadmap.created_at)}
                      >
                        {formatRoadmapDate(roadmap.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              setFormModal({ mode: 'edit', roadmap })
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-blue-400"
                            title="Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRoadmapDelete(roadmap.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Grid View ────────────────────────────────────────────────── */
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((roadmap) => (
              <RoadmapCard
                key={roadmap.id}
                roadmap={roadmap}
                onEdit={(r) => setFormModal({ mode: 'edit', roadmap: r })}
                onRoadmapChange={handleRoadmapChange}
                onRoadmapDelete={handleRoadmapDelete}
              />
            ))}
          </div>
        )}

        {/* ── Footer legend ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-white/5 bg-[#161b22] px-4 py-2.5 font-mono text-[10px] text-gray-700">
          <span className="text-gray-600">// status guide</span>
          {[
            { dot: 'bg-gray-400', label: 'Draft – work in progress' },
            { dot: 'bg-emerald-400', label: 'Published – live on site' },
            { dot: 'bg-amber-400', label: 'Archived – hidden from public' },
          ].map(({ dot, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Form Modal ────────────────────────────────────────────────────── */}
      {formModal && (
        <RoadmapFormPanel
          roadmap={formModal.roadmap ?? null}
          onClose={() => setFormModal(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
