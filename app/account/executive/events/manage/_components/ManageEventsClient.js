/**
 * @file Event management client — executive interface for creating,
 *   editing, featuring, and archiving club events with registration
 *   tracking.
 * @module ExecutiveManageEventsClient
 */

'use client';

import { useState, useTransition } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  MapPin,
  Users,
  Tag,
  Filter,
  Globe,
  Wifi,
  CheckCircle,
  Clock,
  Archive,
  FileEdit,
  X,
  ChevronDown,
} from 'lucide-react';
import {
  execCreateEventAction,
  execUpdateEventAction,
  execDeleteEventAction,
} from '@/app/_lib/executive-actions';
import { driveImageUrl } from '@/app/_lib/utils';
import { useScrollLock } from '@/app/_lib/hooks';

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
  upcoming: {
    label: 'Upcoming',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  ongoing: {
    label: 'Ongoing',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  completed: {
    label: 'Completed',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

const CATEGORIES = [
  'Workshop',
  'Contest',
  'Seminar',
  'Bootcamp',
  'Hackathon',
  'Meetup',
  'Other',
];
const VENUE_TYPES = ['offline', 'online', 'hybrid'];

function EventModal({ event, onClose, onSuccess }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const isEdit = !!event?.id;
  useScrollLock();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.target);
    if (isEdit) fd.set('id', event.id);
    startTransition(async () => {
      const res = isEdit
        ? await execUpdateEventAction(fd)
        : await execCreateEventAction(fd);
      if (res?.error) return setError(res.error);
      onSuccess();
    });
  };

  const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 16) : '');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'Edit Event' : 'Create Event'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"
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
                defaultValue={event?.title || ''}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none"
                placeholder="Event title"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Start Date *
              </label>
              <input
                name="start_date"
                type="datetime-local"
                defaultValue={fmt(event?.start_date)}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white focus:ring-1 focus:ring-blue-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                End Date
              </label>
              <input
                name="end_date"
                type="datetime-local"
                defaultValue={fmt(event?.end_date)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white focus:ring-1 focus:ring-blue-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Location *
              </label>
              <input
                name="location"
                defaultValue={event?.location || ''}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="Location or URL"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Venue Type
              </label>
              <select
                name="venue_type"
                defaultValue={event?.venue_type || 'offline'}
                className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-2.5 text-white focus:outline-none"
              >
                {VENUE_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Category
              </label>
              <select
                name="category"
                defaultValue={event?.category || ''}
                className="w-full rounded-xl border border-white/10 bg-gray-900 px-3 py-2.5 text-white focus:outline-none"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Status
              </label>
              <select
                name="status"
                defaultValue={event?.status || 'draft'}
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
                Max Participants
              </label>
              <input
                name="max_participants"
                type="number"
                defaultValue={event?.max_participants || ''}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="Leave empty for unlimited"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Cover Image URL
              </label>
              <input
                name="cover_image"
                defaultValue={event?.cover_image || ''}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">
                Registration Deadline
              </label>
              <input
                name="registration_deadline"
                type="datetime-local"
                defaultValue={fmt(event?.registration_deadline)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-gray-400">
                Description
              </label>
              <textarea
                name="description"
                defaultValue={event?.description || ''}
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="Short description"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm text-gray-400">
                Tags (comma separated)
              </label>
              <input
                name="tags"
                defaultValue={event?.tags?.join(', ') || ''}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none"
                placeholder="cp, workshop, competitive"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  name="registration_required"
                  type="checkbox"
                  value="true"
                  defaultChecked={event?.registration_required}
                  className="h-4 w-4 rounded accent-blue-500"
                />
                <span className="text-sm text-gray-400">
                  Registration Required
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  name="is_featured"
                  type="checkbox"
                  value="true"
                  defaultChecked={event?.is_featured}
                  className="h-4 w-4 rounded accent-purple-500"
                />
                <span className="text-sm text-gray-400">Featured</span>
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
              {isPending ? 'Saving…' : isEdit ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManageEventsClient({ initialEvents }) {
  const [events, setEvents] = useState(initialEvents);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null); // null | 'create' | event object
  const [deleteId, setDeleteId] = useState(null);
  useScrollLock(!!deleteId);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = events.filter((e) => {
    const matchSearch =
      !search || e.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSuccess = () => {
    setModal(null);
    showToast('Event saved successfully!');
    window.location.reload();
  };

  const handleDelete = (id) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const res = await execDeleteEventAction(fd);
      if (res?.error) return showToast(res.error, 'error');
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setDeleteId(null);
      showToast('Event deleted.');
    });
  };

  const stats = {
    total: events.length,
    upcoming: events.filter((e) => e.status === 'upcoming').length,
    ongoing: events.filter((e) => e.status === 'ongoing').length,
    draft: events.filter((e) => e.status === 'draft').length,
  };

  return (
    <div className="space-y-6 px-4 pt-6 pb-8 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Event Management</h1>
          <p className="mt-1 text-gray-400">
            Create, edit, and publish club events
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> Create Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Events', value: stats.total, color: 'text-blue-400' },
          { label: 'Upcoming', value: stats.upcoming, color: 'text-cyan-400' },
          { label: 'Ongoing', value: stats.ongoing, color: 'text-green-400' },
          { label: 'Drafts', value: stats.draft, color: 'text-amber-400' },
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
            placeholder="Search events…"
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

      {/* Events Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
          <Calendar className="mb-4 h-12 w-12 text-gray-600" />
          <p className="text-lg font-medium text-gray-400">No events found</p>
          <p className="mt-1 text-sm text-gray-500">
            Create your first event to get started
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ev) => {
            const sc = STATUS_CONFIG[ev.status] || STATUS_CONFIG.draft;
            return (
              <div
                key={ev.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/8"
              >
                {ev.cover_image && (
                  <div className="h-36 overflow-hidden bg-gray-800">
                    <img
                      src={driveImageUrl(ev.cover_image)}
                      alt={ev.title}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/placeholder-event.svg';
                      }}
                      className="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-90"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 leading-snug font-semibold text-white">
                      {ev.title}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${sc.color}`}
                    >
                      {sc.label}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {ev.start_date
                        ? new Date(ev.start_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'TBD'}
                    </div>
                    {ev.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {ev.category && (
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                          {ev.category}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {ev.registrationCount || 0} registered
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setModal(ev)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-xs text-gray-300 hover:bg-white/5"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(ev.id)}
                      className="flex items-center justify-center rounded-lg border border-red-500/20 p-1.5 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <EventModal
          event={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Delete Event?</h3>
            <p className="mt-2 text-sm text-gray-400">
              This action cannot be undone. All registrations will also be
              affected.
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

      {/* Toast */}
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
