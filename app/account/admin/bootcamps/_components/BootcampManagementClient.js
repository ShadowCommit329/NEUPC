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
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        ACTIVE
      </span>
    );
  if (status === 'archived')
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
        ARCHIVED
      </span>
    );
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
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
      <div className="min-h-screen bg-gray-50">
      <div className="p-8 pt-10 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">
              Track Management
            </h2>
            <p className="text-base text-gray-500 mt-1">
              Manage and track all educational programs across the platform.
            </p>
          </div>
          <button
            onClick={() => setFormModal({ mode: 'create' })}
            className="bg-indigo-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl shadow hover:bg-indigo-500 transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create New Track
          </button>
        </div>

        {/* Filters & Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-indigo-400"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bootcamps..."
                className="border border-gray-200 rounded-lg py-1.5 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-indigo-400 placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-gray-500">
              Total Tracks:{' '}
              <span className="font-semibold text-gray-800">{stats.total}</span>
            </span>
            <span className="text-gray-500">
              Active:{' '}
              <span className="font-semibold text-gray-800">{stats.published}</span>
            </span>
            <span className="text-gray-500">
              Total Students:{' '}
              <span className="font-semibold text-gray-800">{stats.totalEnrollments}</span>
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Title &amp; Description
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  Students Enrolled
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-sm text-gray-400"
                  >
                    No tracks found.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() =>
                      router.push(`/account/admin/bootcamps/${b.id}`)
                    }
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 overflow-hidden text-indigo-400">
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
                          <div className="text-sm font-semibold text-gray-900">
                            {b.title}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                            {b.description || 'No description provided'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 align-top">{statusPill(b.status)}</td>
                    <td className="py-4 px-6 align-top text-right">
                      <div className="text-sm font-medium text-gray-800">
                        {b.enrollment_count ?? 0}
                      </div>
                    </td>
                    <td className="py-4 px-6 align-top">
                      <div className="text-sm text-gray-800">
                        {b.updated_at
                          ? new Date(b.updated_at).toLocaleDateString()
                          : '—'}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">by Admin</div>
                    </td>
                    <td className="py-4 px-6 align-top text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/account/admin/bootcamps/${b.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={(e) => handleDelete(b.id, e)}
                          disabled={deleteLoading === b.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
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

          {/* Pagination footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-medium text-gray-800">1</span> to{' '}
              <span className="font-medium text-gray-800">{filtered.length}</span> of{' '}
              <span className="font-medium text-gray-800">{filtered.length}</span> tracks
            </div>
            <div className="flex gap-2">
              <button
                disabled
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
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
