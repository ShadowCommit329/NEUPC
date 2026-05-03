'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  Search,
  Terminal,
} from 'lucide-react';
import BootcampFormModal from './BootcampFormModal';
import { sortBootcamps, formatDate, SORT_OPTIONS } from './bootcampConfig';
import { deleteBootcamp } from '@/app/_lib/bootcamp-actions';
import toast from 'react-hot-toast';

function statusPill(status) {
  if (status === 'published')
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        ACTIVE
      </span>
    );
  if (status === 'archived')
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
        ARCHIVED
      </span>
    );
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
      DRAFT
    </span>
  );
}

export default function BootcampManagementClient({ initialBootcamps }) {
  const router = useRouter();
  const [bootcamps, setBootcamps] = useState(initialBootcamps ?? []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formModal, setFormModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  useEffect(() => {
    setBootcamps(initialBootcamps ?? []);
  }, [initialBootcamps]);

  const handleDelete = useCallback(async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this bootcamp forever?')) return;
    setDeleteLoading(id);
    try {
      await deleteBootcamp(id);
      setBootcamps((prev) => prev.filter((b) => b.id !== id));
      toast.success('Bootcamp deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete bootcamp');
    } finally {
      setDeleteLoading(null);
    }
  }, []);

  const handleSaved = useCallback(() => {
    router.refresh();
    setFormModal(null);
  }, [router]);

  const stats = {
    total: bootcamps.length,
    published: bootcamps.filter((b) => b.status === 'published').length,
    totalEnrollments: bootcamps.reduce((s, b) => s + (b.enrollment_count ?? 0), 0),
  };

  const filtered = useMemo(() => {
    return bootcamps.filter((b) => {
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchSearch =
        !search ||
        b.title?.toLowerCase().includes(search.toLowerCase()) ||
        b.description?.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [bootcamps, statusFilter, search]);

  return (
    <>
      <div className="p-6 md:p-8 pt-10 max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="kinetic-headline text-3xl md:text-4xl font-bold text-white mb-2">
              Track <span className="neon-text">Management</span>
            </h2>
            <p className="text-base text-gray-400 mt-1 max-w-xl">
              Manage and track all educational programs across the platform.
            </p>
          </div>
          <button
            onClick={() => setFormModal({ mode: 'create' })}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition-all hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(124,92,255,0.4)] sm:w-auto w-full"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Track</span>
          </button>
        </div>

        {/* Filters & Stats */}
        <div className="glass-panel holographic-card rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">
                Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-40 bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                style={{ colorScheme: 'dark' }}
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bootcamps..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 placeholder:text-gray-500 transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto pb-2 xl:pb-0 scrollbar-hide w-full xl:w-auto justify-start xl:justify-end">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Tracks</span>
              <span className="text-xl font-bold text-white stat-numeral">{stats.total}</span>
            </div>
            <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Active</span>
              <span className="text-xl font-bold text-emerald-400 stat-numeral">{stats.published}</span>
            </div>
            <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Students</span>
              <span className="text-xl font-bold text-violet-400 stat-numeral">{stats.totalEnrollments}</span>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Title &amp; Description
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">
                    Students Enrolled
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-16 text-center text-sm text-gray-500"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Terminal className="h-8 w-8 text-gray-600" />
                        <p>No tracks found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => (
                    <tr
                      key={b.id}
                      className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                      onClick={() =>
                        router.push(`/account/admin/bootcamps/${b.id}`)
                      }
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden text-violet-400 group-hover:border-violet-500/40 transition-colors">
                            {b.thumbnail ? (
                              <img
                                src={b.thumbnail}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Terminal className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                              {b.title}
                            </div>
                            <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                              {b.description || 'No description provided'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 align-top">{statusPill(b.status)}</td>
                      <td className="py-4 px-6 align-top text-right">
                        <div className="text-sm font-medium text-white stat-numeral">
                          {b.enrollment_count ?? 0}
                        </div>
                      </td>
                      <td className="py-4 px-6 align-top">
                        <div className="text-sm text-white">
                          {b.updated_at
                            ? new Date(b.updated_at).toLocaleDateString()
                            : '—'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">by Admin</div>
                      </td>
                      <td className="py-4 px-6 align-top text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/account/admin/bootcamps/${b.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-xl transition-all border border-transparent hover:border-violet-500/20"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={(e) => handleDelete(b.id, e)}
                            disabled={deleteLoading === b.id}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 disabled:opacity-40"
                            title="Delete"
                          >
                            {deleteLoading === b.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="bg-white/5 border-t border-white/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-400">
              Showing{' '}
              <span className="font-medium text-white">
                {filtered.length > 0 ? 1 : 0}
              </span>{' '}
              to{' '}
              <span className="font-medium text-white">{filtered.length}</span> of{' '}
              <span className="font-medium text-white">{filtered.length}</span> tracks
            </div>
            <div className="flex gap-2">
              <button
                disabled
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

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
