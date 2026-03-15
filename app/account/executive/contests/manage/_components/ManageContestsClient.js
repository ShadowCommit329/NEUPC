/**
 * @file Contest management client — executive interface for creating,
 *   editing, and tracking programming contests with participant data.
 * @module ExecutiveManageContestsClient
 */

'use client';

import { useState, useTransition } from 'react';
import {
  Trophy,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  Users,
  Clock,
} from 'lucide-react';
import {
  execCreateContestAction,
  execUpdateContestAction,
  execDeleteContestAction,
} from '@/app/_lib/executive-actions';
import { useScrollLock } from '@/app/_lib/hooks';

const STATUS_CONFIG = {
  upcoming: {
    label: 'Upcoming',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  running: {
    label: 'Running',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  finished: {
    label: 'Finished',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
};

const PLATFORMS = [
  'Codeforces',
  'Vjudge',
  'AtCoder',
  'LeetCode',
  'HackerRank',
  'Custom',
  'Other',
];

function ContestModal({ contest, onClose, onSuccess }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const isEdit = !!contest?.id;
  useScrollLock();

  const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 16) : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.target);
    if (isEdit) fd.set('id', contest.id);
    startTransition(async () => {
      const res = isEdit
        ? await execUpdateContestAction(fd)
        : await execCreateContestAction(fd);
      if (res?.error) return setError(res.error);
      onSuccess();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-xl rounded-2xl border border-white/10 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'Edit Contest' : 'Create Contest'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-gray-400">
                Title *
              </label>
              <input
                name="title"
                defaultValue={contest?.title || ''}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="Contest title"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Platform
              </label>
              <select
                name="platform"
                defaultValue={contest?.platform || ''}
                className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-2.5 text-white focus:outline-none"
              >
                <option value="">Select platform</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Type</label>
              <select
                name="type"
                defaultValue={contest?.type || 'individual'}
                className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-2.5 text-white focus:outline-none"
              >
                <option value="individual">Individual</option>
                <option value="team">Team</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Start Time *
              </label>
              <input
                name="start_time"
                type="datetime-local"
                defaultValue={fmt(contest?.start_time)}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Duration (minutes) *
              </label>
              <input
                name="duration"
                type="number"
                defaultValue={contest?.duration || ''}
                required
                min={1}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="e.g. 120"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Status
              </label>
              <select
                name="status"
                defaultValue={contest?.status || 'upcoming'}
                className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-2.5 text-white focus:outline-none"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Division
              </label>
              <input
                name="division"
                defaultValue={contest?.division || ''}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="e.g. Div. 2, Open"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-gray-400">
                Contest URL
              </label>
              <input
                name="contest_url"
                defaultValue={contest?.contest_url || ''}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="https://codeforces.com/contest/..."
                type="url"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-gray-400">
                Description
              </label>
              <textarea
                name="description"
                defaultValue={contest?.description || ''}
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="Contest details..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                name="is_official"
                type="checkbox"
                value="true"
                id="is_official"
                defaultChecked={contest?.is_official}
                className="h-4 w-4 accent-blue-500"
              />
              <label
                htmlFor="is_official"
                className="cursor-pointer text-sm text-gray-400"
              >
                Official Contest
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-gray-400 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {isPending
                ? 'Saving…'
                : isEdit
                  ? 'Update Contest'
                  : 'Create Contest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManageContestsClient({ initialContests }) {
  const [contests, setContests] = useState(initialContests);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  useScrollLock(!!deleteId);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = contests.filter((c) => {
    const matchSearch =
      !search || c.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSuccess = () => {
    setModal(null);
    showToast('Contest saved!');
    window.location.reload();
  };

  const handleDelete = (id) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const res = await execDeleteContestAction(fd);
      if (res?.error) return showToast(res.error, 'error');
      setContests((prev) => prev.filter((c) => c.id !== id));
      setDeleteId(null);
      showToast('Contest deleted.');
    });
  };

  const fmtDuration = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m}m`;
  };

  const stats = {
    total: contests.length,
    upcoming: contests.filter((c) => c.status === 'upcoming').length,
    running: contests.filter((c) => c.status === 'running').length,
    finished: contests.filter((c) => c.status === 'finished').length,
  };

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Contest Management</h1>
          <p className="mt-1 text-gray-400">
            Organize programming contests for club members
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> Create Contest
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-blue-400' },
          { label: 'Upcoming', value: stats.upcoming, color: 'text-cyan-400' },
          { label: 'Running', value: stats.running, color: 'text-green-400' },
          { label: 'Finished', value: stats.finished, color: 'text-gray-400' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
          >
            <p className="text-sm text-gray-400">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search contests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder-gray-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-gray-900 px-4 py-2.5 text-sm text-white focus:outline-none"
        >
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* Contests List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
          <Trophy className="mb-4 h-12 w-12 text-gray-600" />
          <p className="text-lg font-medium text-gray-400">No contests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.upcoming;
            return (
              <div
                key={c.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-all hover:border-white/20 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <h3 className="font-semibold text-white">{c.title}</h3>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sc.color}`}
                    >
                      {sc.label}
                    </span>
                    {c.is_official && (
                      <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400">
                        Official
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                    {c.platform && (
                      <span className="font-medium text-blue-400">
                        {c.platform}
                      </span>
                    )}
                    {c.start_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(c.start_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {fmtDuration(c.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {c.participantCount || 0} participants
                    </span>
                    {c.type && <span className="capitalize">{c.type}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {c.contest_url && (
                    <a
                      href={c.contest_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-white/10 p-2 text-gray-400 hover:bg-white/5 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => setModal(c)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteId(c.id)}
                    className="rounded-lg border border-red-500/20 p-2 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ContestModal
          contest={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">
              Delete Contest?
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              This will permanently remove the contest and its data.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-gray-400 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={isPending}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
              >
                {isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed right-6 bottom-6 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-xl ${toast.type === 'error' ? 'border-red-500/30 bg-red-500/20 text-red-300' : 'border-green-500/30 bg-green-500/20 text-green-300'}`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
