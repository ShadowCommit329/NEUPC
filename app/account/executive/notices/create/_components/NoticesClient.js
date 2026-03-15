/**
 * @file Notices client — executive interface for creating and managing
 *   club announcements with audience targeting and priority levels.
 * @module ExecutiveNoticesClient
 */

'use client';

import { useState, useTransition } from 'react';
import {
  Bell,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Pin,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  execCreateNoticeAction,
  execUpdateNoticeAction,
  execDeleteNoticeAction,
} from '@/app/_lib/executive-actions';
import { useScrollLock } from '@/app/_lib/hooks';

const PRIORITY_CONFIG = {
  low: {
    label: 'Low',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    Icon: CheckCircle,
  },
  medium: {
    label: 'Medium',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Icon: Info,
  },
  high: {
    label: 'High',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Icon: AlertTriangle,
  },
  critical: {
    label: 'Critical',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    Icon: AlertCircle,
  },
};

const TYPE_COLORS = {
  general: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
  event: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  deadline: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  achievement: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const AUDIENCES = [
  'All',
  'Members',
  'Mentors',
  'Executives',
  'Advisors',
  'Batch 49',
  'Batch 50',
  'Batch 51',
];

function NoticeModal({ notice, onClose, onSuccess }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  useScrollLock();
  const isEdit = !!notice?.id;

  const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 16) : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.target);
    if (isEdit) fd.set('id', notice.id);
    // audience checkboxes
    const checked = [
      ...e.target.querySelectorAll('[name="audience[]"]:checked'),
    ].map((el) => el.value);
    fd.set('target_audience', checked.join(','));
    startTransition(async () => {
      const res = isEdit
        ? await execUpdateNoticeAction(fd)
        : await execCreateNoticeAction(fd);
      if (res?.error) return setError(res.error);
      onSuccess();
    });
  };

  const currentAudience = notice?.target_audience || [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-xl rounded-2xl border border-white/10 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'Edit Notice' : 'Create Notice'}
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

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Title *
              </label>
              <input
                name="title"
                defaultValue={notice?.title || ''}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="Notice title"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-gray-400">
                  Type
                </label>
                <select
                  name="notice_type"
                  defaultValue={notice?.notice_type || 'general'}
                  className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-2.5 text-white focus:outline-none"
                >
                  {Object.keys(TYPE_COLORS).map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-400">
                  Priority
                </label>
                <select
                  name="priority"
                  defaultValue={notice?.priority || 'medium'}
                  className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-2.5 text-white focus:outline-none"
                >
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Content *
              </label>
              <textarea
                name="content"
                defaultValue={notice?.content || ''}
                rows={5}
                required
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="Notice content..."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Target Audience
              </label>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map((a) => (
                  <label
                    key={a}
                    className="flex cursor-pointer items-center gap-1.5"
                  >
                    <input
                      type="checkbox"
                      name="audience[]"
                      value={a}
                      defaultChecked={currentAudience.includes(a)}
                      className="h-3.5 w-3.5 rounded accent-blue-500"
                    />
                    <span className="text-sm text-gray-300">{a}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-gray-400">
                  Expires At
                </label>
                <input
                  name="expires_at"
                  type="datetime-local"
                  defaultValue={fmt(notice?.expires_at)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white focus:outline-none"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    name="is_pinned"
                    type="checkbox"
                    value="true"
                    defaultChecked={notice?.is_pinned}
                    className="h-4 w-4 rounded accent-amber-500"
                  />
                  <span className="text-sm text-gray-400">Pin to top</span>
                </label>
              </div>
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
                  ? 'Update Notice'
                  : 'Publish Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NoticesClient({ initialNotices }) {
  const [notices, setNotices] = useState(initialNotices);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  useScrollLock(!!deleteId);
  const [expanded, setExpanded] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = notices.filter((n) => {
    const matchSearch =
      !search ||
      n.title?.toLowerCase().includes(search.toLowerCase()) ||
      n.content?.toLowerCase().includes(search.toLowerCase());
    const matchPriority =
      priorityFilter === 'all' || n.priority === priorityFilter;
    return matchSearch && matchPriority;
  });

  const handleSuccess = () => {
    setModal(null);
    showToast('Notice saved!');
    window.location.reload();
  };

  const handleDelete = (id) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const res = await execDeleteNoticeAction(fd);
      if (res?.error) return showToast(res.error, 'error');
      setNotices((prev) => prev.filter((n) => n.id !== id));
      setDeleteId(null);
      showToast('Notice deleted.');
    });
  };

  const pinned = filtered.filter((n) => n.is_pinned);
  const regular = filtered.filter((n) => !n.is_pinned);

  const stats = {
    total: notices.length,
    pinned: notices.filter((n) => n.is_pinned).length,
    critical: notices.filter((n) => n.priority === 'critical').length,
    high: notices.filter((n) => n.priority === 'high').length,
  };

  const NoticeCard = ({ notice }) => {
    const pc = PRIORITY_CONFIG[notice.priority] || PRIORITY_CONFIG.medium;
    const PriorityIcon = pc.Icon;
    const isOpen = expanded === notice.id;

    return (
      <div
        className={`rounded-2xl border bg-white/5 backdrop-blur-xl transition-all ${notice.is_pinned ? 'border-amber-500/30' : 'border-white/10 hover:border-white/20'}`}
      >
        <div className="flex items-start gap-3 p-4">
          <div className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${pc.color}`}>
            <PriorityIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {notice.is_pinned && (
                <Pin className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              )}
              <h3 className="leading-snug font-semibold text-white">
                {notice.title}
              </h3>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${pc.color}`}
              >
                {pc.label}
              </span>
              {notice.notice_type !== 'general' && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${TYPE_COLORS[notice.notice_type] || TYPE_COLORS.general}`}
                >
                  {notice.notice_type}
                </span>
              )}
            </div>
            {isOpen && (
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-gray-300">
                {notice.content}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span>{new Date(notice.created_at).toLocaleDateString()}</span>
              {notice.target_audience?.length > 0 && (
                <span>→ {notice.target_audience.join(', ')}</span>
              )}
              {notice.expires_at && (
                <span>
                  Expires: {new Date(notice.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setExpanded(isOpen ? null : notice.id)}
              className="rounded-lg p-2 text-gray-400 hover:bg-white/5"
            >
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setModal(notice)}
              className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleteId(notice.id)}
              className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Notices</h1>
          <p className="mt-1 text-gray-400">
            Create and broadcast announcements to members
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> Create Notice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-blue-400' },
          { label: 'Pinned', value: stats.pinned, color: 'text-amber-400' },
          { label: 'Critical', value: stats.critical, color: 'text-red-400' },
          {
            label: 'High Priority',
            value: stats.high,
            color: 'text-orange-400',
          },
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
            placeholder="Search notices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder-gray-500 focus:outline-none"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-gray-900 px-4 py-2.5 text-sm text-white focus:outline-none"
        >
          <option value="all">All Priority</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-amber-400 uppercase">
            <Pin className="h-4 w-4" /> Pinned Notices
          </h2>
          {pinned.map((n) => (
            <NoticeCard key={n.id} notice={n} />
          ))}
        </div>
      )}

      {/* Regular */}
      <div className="space-y-3">
        {pinned.length > 0 && regular.length > 0 && (
          <h2 className="text-sm font-semibold tracking-wide text-gray-400 uppercase">
            All Notices
          </h2>
        )}
        {regular.length === 0 && pinned.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
            <Bell className="mb-4 h-12 w-12 text-gray-600" />
            <p className="text-lg font-medium text-gray-400">
              No notices found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Create a notice to broadcast to members
            </p>
          </div>
        ) : (
          regular.map((n) => <NoticeCard key={n.id} notice={n} />)
        )}
      </div>

      {modal && (
        <NoticeModal
          notice={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Delete Notice?</h3>
            <p className="mt-2 text-sm text-gray-400">
              This will permanently remove this announcement.
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
