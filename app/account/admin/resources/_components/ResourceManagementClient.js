/**
 * @file Resource management client — admin interface for listing,
 *   creating, editing, and organising shared learning materials
 *   and documents.
 * @module AdminResourceManagementClient
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Layers,
  Star,
  Search,
  PlusCircle,
  ThumbsUp,
  Unlock,
  Lock,
  BookOpen,
  Filter,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import ResourceCard from './ResourceCard';
import ResourceFormModal from './ResourceFormModal';
import {
  getTypeConfig,
  RESOURCE_TYPES,
  CATEGORIES,
  DIFFICULTIES,
  getDifficultyConfig,
} from './resourceConfig';

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, colorClass, sub }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3.5 backdrop-blur-sm">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl leading-none font-bold text-white tabular-nums">
          {value}
        </p>
        <p className="mt-1 truncate text-xs text-gray-500">{label}</p>
        {sub && (
          <p className="mt-0.5 truncate text-[10px] text-gray-600">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onCreateClick }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-20 text-center">
      <BookOpen className="mb-4 h-12 w-12 text-gray-700" />
      <p className="text-sm font-semibold text-gray-400">No resources found</p>
      <p className="mt-1 text-xs text-gray-600">
        Try adjusting your filters or add a new resource.
      </p>
      <button
        onClick={onCreateClick}
        className="mt-5 flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-teal-500"
      >
        <PlusCircle className="h-3.5 w-3.5" /> Add Resource
      </button>
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
          className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
            active ? 'bg-white/15 text-white' : 'bg-white/6 text-gray-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export default function ResourceManagementClient({ initialResources, stats }) {
  const [resources, setResources] = useState(initialResources ?? []);
  const [activeTab, setActiveTab] = useState('all'); // all | featured | free | paid
  const [typeFilter, setTypeFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [formModal, setFormModal] = useState(null); // null | { mode, resource? }

  // ── live stats ────────────────────────────────────────────────────────────
  const live = {
    total: resources.length,
    featured: resources.filter((r) => r.is_featured).length,
    free: resources.filter((r) => r.is_free).length,
    paid: resources.filter((r) => !r.is_free).length,
    totalUpvotes: resources.reduce((s, r) => s + (r.upvotes ?? 0), 0),
  };

  // ── filtered ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'featured' && r.is_featured) ||
        (activeTab === 'free' && r.is_free) ||
        (activeTab === 'paid' && !r.is_free);
      const matchesType = !typeFilter || r.resource_type === typeFilter;
      const matchesDiff =
        !difficultyFilter || r.difficulty === difficultyFilter;
      const matchesCat = !categoryFilter || r.category === categoryFilter;
      const matchesSearch =
        !search ||
        r.title?.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase()) ||
        r.category?.toLowerCase().includes(search.toLowerCase()) ||
        r.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      return (
        matchesTab && matchesType && matchesDiff && matchesCat && matchesSearch
      );
    });
  }, [
    resources,
    activeTab,
    typeFilter,
    difficultyFilter,
    categoryFilter,
    search,
  ]);

  return (
    <>
      <div className="space-y-6">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-emerald-500/8 blur-3xl" />
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
                <span className="font-medium text-gray-400">Resources</span>
              </nav>
              <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 ring-1 ring-teal-500/25">
                  <BookOpen className="h-5 w-5 text-teal-400" />
                </div>
                Resource Management
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                {live.total} resource{live.total !== 1 ? 's' : ''} · {live.free}{' '}
                free · {live.totalUpvotes.toLocaleString()} upvotes
              </p>
            </div>
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <Link
                href="/account/admin"
                className="rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-white/15 hover:bg-white/8 hover:text-white"
              >
                ← Dashboard
              </Link>
              <button
                onClick={() => setFormModal({ mode: 'create' })}
                className="group flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-teal-900/30 transition-all hover:-translate-y-0.5 hover:bg-teal-500 hover:shadow-xl hover:shadow-teal-900/40"
              >
                <PlusCircle className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
                Add Resource
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={Layers}
            label="Total Resources"
            value={live.total}
            colorClass="bg-teal-500/15 text-teal-400"
          />
          <StatCard
            icon={Star}
            label="Featured"
            value={live.featured}
            colorClass="bg-amber-500/15 text-amber-400"
          />
          <StatCard
            icon={Unlock}
            label="Free"
            value={live.free}
            colorClass="bg-emerald-500/15 text-emerald-400"
          />
          <StatCard
            icon={Lock}
            label="Paid"
            value={live.paid}
            colorClass="bg-orange-500/15 text-orange-400"
          />
          <StatCard
            icon={ThumbsUp}
            label="Total Upvotes"
            value={live.totalUpvotes}
            colorClass="bg-violet-500/15 text-violet-400"
          />
        </div>

        {/* ── Tabs + Filters ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {/* Tab row */}
          <div className="scrollbar-hide flex gap-1 overflow-x-auto pb-1">
            <TabButton
              active={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              count={live.total}
            >
              All
            </TabButton>
            <TabButton
              active={activeTab === 'featured'}
              onClick={() => setActiveTab('featured')}
              count={live.featured}
            >
              <Star className="h-3 w-3" /> Featured
            </TabButton>
            <TabButton
              active={activeTab === 'free'}
              onClick={() => setActiveTab('free')}
              count={live.free}
            >
              <Unlock className="h-3 w-3" /> Free
            </TabButton>
            <TabButton
              active={activeTab === 'paid'}
              onClick={() => setActiveTab('paid')}
              count={live.paid}
            >
              <Lock className="h-3 w-3" /> Paid
            </TabButton>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative min-w-40 flex-1">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search resources…"
                className="w-full rounded-xl border border-white/8 bg-white/4 py-2 pr-3 pl-8 text-xs text-white placeholder-gray-600 outline-none focus:border-white/20 focus:bg-white/6"
              />
            </div>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none rounded-xl border border-white/8 bg-white/4 py-2 pr-8 pl-3 text-xs text-gray-300 outline-none focus:border-white/20"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">All types</option>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {getTypeConfig(t).emoji} {getTypeConfig(t).label}
                </option>
              ))}
            </select>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none rounded-xl border border-white/8 bg-white/4 py-2 pr-8 pl-3 text-xs text-gray-300 outline-none focus:border-white/20"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Difficulty filter */}
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="appearance-none rounded-xl border border-white/8 bg-white/4 py-2 pr-8 pl-3 text-xs text-gray-300 outline-none focus:border-white/20"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">All levels</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {getDifficultyConfig(d).label}
                </option>
              ))}
            </select>

            {/* Clear filters */}
            {(typeFilter || categoryFilter || difficultyFilter || search) && (
              <button
                onClick={() => {
                  setTypeFilter('');
                  setCategoryFilter('');
                  setDifficultyFilter('');
                  setSearch('');
                }}
                className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-white/8 hover:text-gray-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Active filter count */}
          {filtered.length !== resources.length && (
            <p className="text-xs text-gray-600">
              Showing {filtered.length} of {resources.length} resources
            </p>
          )}
        </div>

        {/* ── Grid ──────────────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <EmptyState onCreateClick={() => setFormModal({ mode: 'create' })} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((r) => (
              <ResourceCard
                key={r.id}
                resource={r}
                onEdit={(res) => setFormModal({ mode: 'edit', resource: res })}
              />
            ))}
          </div>
        )}

        {/* ── Type legend ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/6 bg-white/2 px-4 py-2.5 text-[11px] text-gray-600">
          <span className="font-semibold text-gray-500">Types:</span>
          {RESOURCE_TYPES.map((t) => {
            const c = getTypeConfig(t);
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                className={`flex items-center gap-1 rounded-lg px-1.5 py-0.5 transition-colors ${
                  typeFilter === t
                    ? 'bg-white/10 text-white'
                    : 'hover:text-gray-400'
                }`}
              >
                {c.emoji} {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Form Modal ──────────────────────────────────────────────────────── */}
      {formModal && (
        <ResourceFormModal
          mode={formModal.mode}
          resource={formModal.resource ?? null}
          onClose={() => setFormModal(null)}
        />
      )}
    </>
  );
}
