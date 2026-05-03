'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  Plus,
  Search,
  Terminal,
  LayoutGrid,
  LayoutList,
  TrendingUp,
  Users,
  Zap,
  BookOpen,
  ChevronDown,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import BootcampCard from './BootcampCard';
import BootcampFormModal from './BootcampFormModal';
import BootcampTableRow from './BootcampTableRow';
import { sortBootcamps, SORT_OPTIONS } from './bootcampConfig';
import { deleteBootcamp, toggleBootcampFeatured } from '@/app/_lib/bootcamp-actions';
import toast from 'react-hot-toast';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Tracks', color: 'text-gray-300' },
  { value: 'published', label: 'Published', color: 'text-emerald-400' },
  { value: 'draft', label: 'Draft', color: 'text-amber-400' },
  { value: 'archived', label: 'Archived', color: 'text-gray-500' },
];

export default function BootcampManagementClient({ initialBootcamps }) {
  const router = useRouter();
  const [bootcamps, setBootcamps] = useState(initialBootcamps ?? []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [formModal, setFormModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setBootcamps(initialBootcamps ?? []);
  }, [initialBootcamps]);

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Permanently delete this bootcamp? This cannot be undone.')) return;
    setDeleteLoading(id);
    try {
      await deleteBootcamp(id);
      setBootcamps((prev) => prev.filter((b) => b.id !== id));
      toast.success('Bootcamp deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to delete bootcamp');
    } finally {
      setDeleteLoading(null);
    }
  }, []);

  const handleToggleFeatured = useCallback(async (id) => {
    try {
      await toggleBootcampFeatured(id);
      setBootcamps((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_featured: !b.is_featured } : b))
      );
      toast.success('Featured status updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update featured status');
    }
  }, []);

  const handleSaved = useCallback(() => {
    router.refresh();
    setFormModal(null);
  }, [router]);

  const stats = useMemo(() => ({
    total: bootcamps.length,
    published: bootcamps.filter((b) => b.status === 'published').length,
    draft: bootcamps.filter((b) => b.status === 'draft').length,
    totalEnrollments: bootcamps.reduce((s, b) => s + (b.enrollment_count ?? 0), 0),
    totalLessons: bootcamps.reduce((s, b) => s + (b.total_lessons ?? 0), 0),
  }), [bootcamps]);

  const filtered = useMemo(() => {
    let result = bootcamps.filter((b) => {
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchSearch =
        !search ||
        b.title?.toLowerCase().includes(search.toLowerCase()) ||
        b.description?.toLowerCase().includes(search.toLowerCase()) ||
        b.batch_info?.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
    return sortBootcamps(result, sortKey);
  }, [bootcamps, statusFilter, search, sortKey]);

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (sortKey !== 'newest' ? 1 : 0);

  return (
    <>
      <div className="min-h-screen p-6 md:p-8 pt-8 max-w-7xl mx-auto space-y-6">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/25">
                <GraduationCap className="h-5 w-5 text-violet-400" />
              </div>
              <span className="text-xs font-semibold text-violet-400/70 uppercase tracking-[0.18em] font-mono">
                Admin / Bootcamps
              </span>
            </div>
            <h1 className="kinetic-headline text-3xl md:text-4xl font-bold text-white">
              Track <span className="neon-text">Management</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1.5">
              {stats.total} learning tracks · {stats.totalEnrollments} total enrollments
            </p>
          </div>

          <button
            onClick={() => setFormModal({ mode: 'create' })}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-violet-500 hover:shadow-[0_0_24px_rgba(124,92,255,0.45)] sm:w-auto w-full"
          >
            <span className="absolute inset-0 translate-y-full group-hover:translate-y-0 bg-violet-500 transition-transform duration-300 ease-out" />
            <Plus className="relative h-4 w-4" />
            <span className="relative">Create New Track</span>
          </button>
        </div>

        {/* ── Stats Row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Total Tracks',
              value: stats.total,
              icon: GraduationCap,
              color: 'text-violet-400',
              bg: 'bg-violet-500/10 border-violet-500/20',
            },
            {
              label: 'Published',
              value: stats.published,
              icon: Zap,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
            },
            {
              label: 'Total Students',
              value: stats.totalEnrollments,
              icon: Users,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 border-blue-500/20',
            },
            {
              label: 'Total Lessons',
              value: stats.totalLessons,
              icon: BookOpen,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className={`glass-panel rounded-2xl p-4 border ${bg} flex items-center gap-3`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg} border`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold stat-numeral ${color}`}>{value}</div>
                <div className="text-xs text-gray-500 font-medium">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar: Search + Filters + View Toggle ──────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracks, descriptions, batches..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 placeholder:text-gray-600 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            {STATUS_FILTERS.map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  statusFilter === value
                    ? `bg-white/10 ${color}`
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
                {value !== 'all' && (
                  <span className={`ml-1.5 text-[10px] tabular-nums ${statusFilter === value ? color : 'text-gray-600'}`}>
                    {bootcamps.filter((b) => b.status === value).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort + View toggle */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 pr-8 outline-none focus:border-violet-500/50 transition-all cursor-pointer"
                style={{ colorScheme: 'dark' }}
              >
                {SORT_OPTIONS.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500 pointer-events-none" />
            </div>

            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-violet-500/20 text-violet-400' : 'text-gray-500 hover:text-gray-300'}`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-violet-500/20 text-violet-400' : 'text-gray-500 hover:text-gray-300'}`}
                title="List view"
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Results Summary ───────────────────────────────────────────────── */}
        {(search || statusFilter !== 'all') && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>
              Showing <span className="text-white font-medium">{filtered.length}</span> of{' '}
              <span className="text-white font-medium">{bootcamps.length}</span> tracks
            </span>
            {(search || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                className="ml-2 flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors font-medium"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ── Empty State ───────────────────────────────────────────────────── */}
        {filtered.length === 0 && (
          <div className="flex min-h-[340px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
            <div className="text-center max-w-xs">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                <Terminal className="h-7 w-7 text-gray-600" />
              </div>
              {search || statusFilter !== 'all' ? (
                <>
                  <p className="text-white font-semibold mb-1">No tracks found</p>
                  <p className="text-sm text-gray-500 mb-4">Try adjusting your search or filters.</p>
                  <button
                    onClick={() => { setSearch(''); setStatusFilter('all'); }}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium underline underline-offset-2"
                  >
                    Clear all filters
                  </button>
                </>
              ) : (
                <>
                  <p className="text-white font-semibold mb-1">No tracks yet</p>
                  <p className="text-sm text-gray-500 mb-4">Create your first learning track to get started.</p>
                  <button
                    onClick={() => setFormModal({ mode: 'create' })}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Track
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Grid View ──────────────────────────────────────────────────────── */}
        {filtered.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((b) => (
              <BootcampCard
                key={b.id}
                bootcamp={b}
                onToggleFeatured={handleToggleFeatured}
                onDelete={handleDelete}
                deleteLoading={deleteLoading === b.id}
              />
            ))}
          </div>
        )}

        {/* ── List View ──────────────────────────────────────────────────────── */}
        {filtered.length > 0 && viewMode === 'list' && (
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="py-3 px-5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Track</th>
                    <th className="py-3 px-5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Students</th>
                    <th className="py-3 px-5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Lessons</th>
                    <th className="py-3 px-5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Updated</th>
                    <th className="py-3 px-5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((b) => (
                    <BootcampTableRow
                      key={b.id}
                      bootcamp={b}
                      onToggleFeatured={handleToggleFeatured}
                      onDelete={handleDelete}
                      deleteLoading={deleteLoading === b.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-white/8 px-5 py-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {filtered.length} track{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
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
