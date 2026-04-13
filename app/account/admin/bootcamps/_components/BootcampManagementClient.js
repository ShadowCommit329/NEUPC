/**
 * @file Bootcamp management client — admin interface for listing,
 *   filtering, creating, and managing bootcamps.
 * @module AdminBootcampManagementClient
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  Star,
  Search,
  PlusCircle,
  Eye,
  Users,
  Clock,
  BookOpen,
  Layers,
  LayoutGrid,
  LayoutList,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  ExternalLink,
  MoreVertical,
  Calendar,
  DollarSign,
  CheckCircle2,
  FileEdit,
  Archive,
  Loader2,
} from 'lucide-react';
import BootcampCard from './BootcampCard';
import BootcampFormModal from './BootcampFormModal';
import {
  getStatusConfig,
  BOOTCAMP_STATUSES,
  SORT_OPTIONS,
  sortBootcamps,
  formatDate,
  formatRelativeDate,
  formatDuration,
  formatPrice,
} from './bootcampConfig';
import {
  deleteBootcamp,
  toggleBootcampFeatured,
} from '@/app/_lib/bootcamp-actions';
import toast from 'react-hot-toast';

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
      icon: GraduationCap,
      title: 'No bootcamps yet',
      sub: 'Create your first bootcamp to get started.',
    },
    draft: {
      icon: FileEdit,
      title: 'No draft bootcamps',
      sub: 'Drafts appear here when saved unpublished.',
    },
    published: { icon: CheckCircle2, title: 'No published bootcamps', sub: '' },
    archived: { icon: Archive, title: 'No archived bootcamps', sub: '' },
    featured: {
      icon: Star,
      title: 'No featured bootcamps',
      sub: 'Star a bootcamp to feature it on the homepage.',
    },
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
          <PlusCircle className="h-3.5 w-3.5" /> New Bootcamp
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

export default function BootcampManagementClient({ initialBootcamps }) {
  const router = useRouter();
  const [bootcamps, setBootcamps] = useState(initialBootcamps ?? []);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [formModal, setFormModal] = useState(null); // null | { mode, bootcamp? }
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [sortOpen, setSortOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Sync local state when server re-renders
  useEffect(() => {
    setBootcamps(initialBootcamps ?? []);
  }, [initialBootcamps]);

  // ── handlers ──────────────────────────────────────────────────────────
  const handleBootcampChange = useCallback((bootcampId, changes) => {
    setBootcamps((prev) =>
      prev.map((b) => (b.id === bootcampId ? { ...b, ...changes } : b))
    );
  }, []);

  const handleBootcampDelete = useCallback(async (bootcampId) => {
    if (
      !confirm(
        'Are you sure you want to delete this bootcamp? This action cannot be undone.'
      )
    ) {
      return;
    }

    setDeleteLoading(bootcampId);
    try {
      await deleteBootcamp(bootcampId);
      setBootcamps((prev) => prev.filter((b) => b.id !== bootcampId));
      toast.success('Bootcamp deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete bootcamp');
    } finally {
      setDeleteLoading(null);
    }
  }, []);

  const handleToggleFeatured = useCallback(
    async (bootcampId) => {
      try {
        const updated = await toggleBootcampFeatured(bootcampId);
        handleBootcampChange(bootcampId, { is_featured: updated.is_featured });
        toast.success(
          updated.is_featured ? 'Bootcamp featured' : 'Bootcamp unfeatured'
        );
      } catch (err) {
        toast.error(err.message || 'Failed to update bootcamp');
      }
    },
    [handleBootcampChange]
  );

  const handleSaved = useCallback(() => {
    router.refresh();
    setFormModal(null);
  }, [router]);

  // ── derived stats ─────────────────────────────────────────────────────
  const stats = {
    total: bootcamps.length,
    published: bootcamps.filter((b) => b.status === 'published').length,
    draft: bootcamps.filter((b) => b.status === 'draft').length,
    archived: bootcamps.filter((b) => b.status === 'archived').length,
    featured: bootcamps.filter((b) => b.is_featured).length,
    totalEnrollments: bootcamps.reduce(
      (s, b) => s + (b.enrollment_count ?? 0),
      0
    ),
    totalLessons: bootcamps.reduce((s, b) => s + (b.total_lessons ?? 0), 0),
  };

  // ── filtered + sorted bootcamps ────────────────────────────────────────
  const filtered = useMemo(() => {
    const result = bootcamps.filter((b) => {
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'featured' ? b.is_featured : b.status === activeTab);
      const matchesSearch =
        !search ||
        b.title?.toLowerCase().includes(search.toLowerCase()) ||
        b.description?.toLowerCase().includes(search.toLowerCase()) ||
        b.batch_info?.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
    return sortBootcamps(result, sortBy);
  }, [bootcamps, activeTab, search, sortBy]);

  return (
    <>
      <div className="mx-4 my-6 space-y-6 sm:mx-6 lg:mx-8">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-white/6 via-white/3 to-white/5 p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-500/6 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl" />

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
                <span className="text-gray-400">Bootcamp Management</span>
              </nav>
              <h1 className="flex items-center gap-3 text-xl font-bold text-white sm:text-2xl">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 ring-1 ring-violet-500/30">
                  <GraduationCap className="h-5 w-5 text-violet-400" />
                </div>
                Bootcamp Management
              </h1>
              <p className="mt-1.5 text-sm text-gray-500">
                {stats.total} bootcamp{stats.total !== 1 ? 's' : ''} ·{' '}
                {stats.published} published ·{' '}
                {stats.totalEnrollments.toLocaleString()} total enrollments
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
                className="group flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-violet-500 active:scale-95"
              >
                <PlusCircle className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
                New Bootcamp
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            icon={Layers}
            label="Total Bootcamps"
            value={stats.total}
            colorClass="bg-gray-700/50 text-gray-300"
            accentGradient="bg-linear-to-br from-gray-500/5 to-transparent"
          />
          <StatCard
            icon={CheckCircle2}
            label="Published"
            value={stats.published}
            colorClass="bg-emerald-500/15 text-emerald-400"
            accentGradient="bg-linear-to-br from-emerald-500/8 to-transparent"
          />
          <StatCard
            icon={FileEdit}
            label="Drafts"
            value={stats.draft}
            colorClass="bg-gray-600/20 text-gray-400"
            accentGradient="bg-linear-to-br from-gray-500/6 to-transparent"
          />
          <StatCard
            icon={Star}
            label="Featured"
            value={stats.featured}
            colorClass="bg-amber-500/15 text-amber-400"
            accentGradient="bg-linear-to-br from-amber-500/8 to-transparent"
          />
          <StatCard
            icon={Users}
            label="Total Enrollments"
            value={
              stats.totalEnrollments >= 1000
                ? `${(stats.totalEnrollments / 1000).toFixed(1)}k`
                : stats.totalEnrollments
            }
            colorClass="bg-blue-500/15 text-blue-400"
            accentGradient="bg-linear-to-br from-blue-500/8 to-transparent"
          />
          <StatCard
            icon={BookOpen}
            label="Total Lessons"
            value={stats.totalLessons}
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
                count={stats.total}
              >
                All
              </TabButton>
              <TabButton
                active={activeTab === 'published'}
                onClick={() => setActiveTab('published')}
                count={stats.published}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{' '}
                Published
              </TabButton>
              <TabButton
                active={activeTab === 'draft'}
                onClick={() => setActiveTab('draft')}
                count={stats.draft}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Draft
              </TabButton>
              <TabButton
                active={activeTab === 'archived'}
                onClick={() => setActiveTab('archived')}
                count={stats.archived}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{' '}
                Archived
              </TabButton>
              <TabButton
                active={activeTab === 'featured'}
                onClick={() => setActiveTab('featured')}
                count={stats.featured}
              >
                <Star className="h-3 w-3" /> Featured
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

          {/* Search + Sort */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bootcamps by title, description..."
                className="w-full rounded-xl border border-white/8 bg-white/4 py-2 pr-3 pl-8 text-xs text-white placeholder-gray-400 transition-all outline-none focus:border-white/20 focus:bg-white/6"
              />
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs text-gray-300 transition-all hover:border-white/15 hover:bg-white/6 hover:text-white"
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
          </div>

          {/* Results count */}
          {(search || activeTab !== 'all') && (
            <p className="text-xs text-gray-400">
              Showing {filtered.length} of {bootcamps.length} bootcamp
              {bootcamps.length !== 1 ? 's' : ''}
              {search && (
                <span>
                  {' '}
                  matching &quot;<span className="text-gray-400">{search}</span>
                  &quot;
                </span>
              )}
            </p>
          )}
        </div>

        {/* ── Bootcamp grid / table ───────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <EmptyState
            tab={activeTab}
            onCreateClick={() => setFormModal({ mode: 'create' })}
          />
        ) : viewMode === 'table' ? (
          /* ── Table View ──────────────────────────────────────────────── */
          <div className="overflow-x-auto rounded-xl border border-white/8 bg-[#0d1117]">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/6 bg-[#161b22]">
                  <th className="w-8 px-3 py-3 text-center font-medium text-gray-700">
                    #
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-500">
                    bootcamp
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-500">
                    status
                  </th>
                  <th className="hidden px-4 py-3 font-medium text-gray-500 md:table-cell">
                    batch
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">
                    price
                  </th>
                  <th className="hidden px-4 py-3 text-right font-medium text-gray-500 sm:table-cell">
                    enrolled
                  </th>
                  <th className="hidden px-4 py-3 text-right font-medium text-gray-500 lg:table-cell">
                    lessons
                  </th>
                  <th className="hidden px-4 py-3 font-medium text-gray-500 lg:table-cell">
                    created
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">
                    actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {filtered.map((bootcamp, rowIdx) => {
                  const sc = getStatusConfig(bootcamp.status);
                  return (
                    <tr
                      key={bootcamp.id}
                      className="group transition-colors hover:bg-[#161b22]"
                    >
                      <td className="px-3 py-3 text-center font-mono text-[10px] text-gray-700 select-none">
                        {String(rowIdx + 1).padStart(2, '0')}
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <div className="flex items-center gap-3">
                          {bootcamp.thumbnail ? (
                            <img
                              src={bootcamp.thumbnail}
                              alt=""
                              className="hidden h-8 w-14 shrink-0 rounded-md object-cover sm:block"
                            />
                          ) : (
                            <div className="hidden h-8 w-14 shrink-0 items-center justify-center rounded-md bg-violet-500/10 sm:flex">
                              <GraduationCap className="h-4 w-4 text-violet-400/50" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs font-semibold text-gray-200">
                              {bootcamp.title}
                            </p>
                            {bootcamp.is_featured && (
                              <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-[9px] text-amber-400">
                                <Star className="h-2.5 w-2.5 fill-current" />{' '}
                                featured
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${sc.dot}`}
                          />
                          {sc.label}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span className="font-mono text-[11px] text-gray-500">
                          {bootcamp.batch_info || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-400 tabular-nums">
                        {formatPrice(bootcamp.price)}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono text-gray-500 tabular-nums sm:table-cell">
                        {bootcamp.enrollment_count ?? 0}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono text-gray-500 tabular-nums lg:table-cell">
                        {bootcamp.total_lessons ?? 0}
                      </td>
                      <td
                        className="hidden px-4 py-3 font-mono text-[11px] text-gray-700 lg:table-cell"
                        title={formatDate(bootcamp.created_at)}
                      >
                        {formatRelativeDate(bootcamp.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/account/admin/bootcamps/${bootcamp.id}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-blue-400"
                            title="Edit & Curriculum"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => handleToggleFeatured(bootcamp.id)}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/8 ${
                              bootcamp.is_featured
                                ? 'text-amber-400'
                                : 'text-gray-500 hover:text-amber-400'
                            }`}
                            title={
                              bootcamp.is_featured ? 'Unfeature' : 'Feature'
                            }
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${bootcamp.is_featured ? 'fill-current' : ''}`}
                            />
                          </button>
                          {bootcamp.status === 'published' && (
                            <Link
                              href={`/account/member/bootcamps/${bootcamp.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-emerald-400"
                              title="Preview as member"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          <button
                            onClick={() => handleBootcampDelete(bootcamp.id)}
                            disabled={deleteLoading === bootcamp.id}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/8 hover:text-red-400 disabled:opacity-50"
                            title="Delete"
                          >
                            {deleteLoading === bootcamp.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
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
          /* ── Grid View ───────────────────────────────────────────────── */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((bootcamp) => (
              <BootcampCard
                key={bootcamp.id}
                bootcamp={bootcamp}
                onToggleFeatured={handleToggleFeatured}
                onDelete={handleBootcampDelete}
                deleteLoading={deleteLoading === bootcamp.id}
              />
            ))}
          </div>
        )}

        {/* ── Footer legend ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-white/5 bg-white/4 px-4 py-3 font-mono text-xs text-gray-500">
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

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {formModal && (
        <BootcampFormModal
          bootcamp={formModal.bootcamp ?? null}
          onClose={() => setFormModal(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
